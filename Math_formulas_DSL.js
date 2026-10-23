(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('This extension must run in unsandboxed mode!');
    }

    const EXTENSION_VERSION = "1.0.0";

    class MathFormulasExtension {
        getInfo() {
            return {
                id: 'mathFormulasDesktopDSLv1',
                name: 'Math Formulas & DSL v1.0.0',
                color1: '#00838f',
                color2: '#006064',
                color3: '#00363a',
                blocks: [
                    {
                        opcode: 'executeDSL',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'execute DSL [FORMULA] to list [LIST]',
                        arguments: {
                            FORMULA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'pre{deg}; var m = 0; par[repeat(6) |$run| var m = m + 30; output(10 * sin(m))]'
                            },
                            LIST: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'LIST_MENU'
                            }
                        }
                    },
                    {
                        opcode: 'evaluateFormula',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'operation [FORMULA]',
                        arguments: {
                            FORMULA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '2 + 3 * 4'
                            }
                        }
                    },
                    {
                        opcode: 'getExtensionVersion',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'extension version'
                    },
                    {
                        opcode: 'showLibAndSyntaxModal',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'show lib and syntax'
                    }
                ],
                menus: {
                    LIST_MENU: {
                        acceptReporters: true,
                        items: 'getLists'
                    }
                }
            };
        }

        getExtensionVersion() {
            return EXTENSION_VERSION;
        }

        getLists() {
            try {
                const stage = Scratch.vm.runtime.getTargetForStage();
                const target = Scratch.vm.runtime.getEditingTarget() || stage;
                const lists = [];

                if (target && target.variables) {
                    for (const id in target.variables) {
                        if (target.variables[id].type === 'list') {
                            lists.push(target.variables[id].name);
                        }
                    }
                }
                if (stage && stage !== target && stage.variables) {
                    for (const id in stage.variables) {
                        if (stage.variables[id].type === 'list') {
                            if (!lists.includes(stage.variables[id].name)) {
                                lists.push(stage.variables[id].name);
                            }
                        }
                    }
                }
                return lists.length > 0 ? lists : ['list'];
            } catch (e) {
                return ['list'];
            }
        }

        _parseAndExecute(script, context = {}) {
            if (!script || typeof script !== 'string') {
                return "ERROR(2): invalid syntax";
            }

            try {
                let config = { angleMode: 'rad', single: false, repeatCount: null };
                
                // Незалежне зчитування налаштувань pre{...}
                const preMatch = script.match(/pre\s*\{\s*([^}]+)\s*\}/i);
                if (preMatch) {
                    const settings = preMatch[1].split(',').map(s => s.trim().toLowerCase());
                    if (settings.includes('deg')) config.angleMode = 'deg';
                    if (settings.includes('rad')) config.angleMode = 'rad';
                    script = script.replace(/pre\s*\{\s*[^}]+\s*\}/gi, '');
                }

                let scope = {
                    x: context.x || 0,
                    y: context.y || 0,
                    i: 0,
                    t: (Date.now() - (context.startTime || Date.now())) / 1000,
                    m: 0,
                    ...(context.variables || {})
                };

                let executedOutputs = context.collectedOutputs || [];

                const parIndex = script.search(/par\s*\[/i);
                let beforePar = parIndex !== -1 ? script.substring(0, parIndex) : script;
                let parBlock = parIndex !== -1 ? script.substring(parIndex) : '';

                // Якщо макросу немає — незалежний лінійний прорахунок виразу
                if (parBlock.trim() === '') {
                    const statements = beforePar.split(';').map(s => s.trim()).filter(Boolean);
                    if (statements.length === 0) return 0;
                    
                    let lastRes = 0;
                    for (let st of statements) {
                        if (st.startsWith('var ')) st = st.substring(4).trim();
                        const eqIndex = st.indexOf('=');
                        if (eqIndex !== -1) {
                            let vName = st.substring(0, eqIndex).trim();
                            let expr = st.substring(eqIndex + 1).trim();
                            scope[vName] = this._evaluateExpr(expr, scope, config);
                            lastRes = scope[vName];
                            continue;
                        }
                        lastRes = this._evaluateExpr(st, scope, config);
                    }
                    return lastRes;
                }

                // Незалежна ініціалізація змінних перед макросом
                const initStatements = beforePar.split(';').map(s => s.trim()).filter(Boolean);
                for (let st of initStatements) {
                    if (st.startsWith('var ')) st = st.substring(4).trim();
                    const eqIndex = st.indexOf('=');
                    if (eqIndex !== -1) {
                        let varName = st.substring(0, eqIndex).trim();
                        let expr = st.substring(eqIndex + 1).trim();
                        scope[varName] = this._evaluateExpr(expr, scope, config);
                    }
                }

                // Автономна обробка макросу par[...]
                const parMatch = parBlock.match(/par\s*\[\s*([\s\S]*?)\s*\]/i);
                if (parMatch) {
                    let parContent = parMatch[1];
                    
                    if (/single/i.test(parContent)) config.single = true;
                    
                    const repMatch = parContent.match(/repeat\s*[\(\[]\s*(\d+)\s*[\)\]]/i);
                    if (repMatch) config.repeatCount = parseInt(repMatch[1], 10);

                    const runSplit = parContent.split(/\|\s*\$?\s*run\s*\|/i);
                    if (runSplit.length > 1) {
                        let body = runSplit[1];
                        let iterations = config.single ? 1 : (config.repeatCount || 1);

                        let rawStatements = body.split(';').map(s => s.trim()).filter(Boolean);

                        for (let iter = 0; iter < iterations; iter++) {
                            scope.i = iter;

                            for (let st of rawStatements) {
                                if (!st) continue;

                                let outMatch = st.match(/^output\s*[\(\[]\s*([\s\S]*)\s*[\)\]]$/i);
                                if (outMatch) {
                                    let innerExpr = outMatch[1];
                                    let evaluated = this._evaluateExpr(innerExpr, scope, config);
                                    executedOutputs.push(evaluated);
                                    continue;
                                }

                                if (st.startsWith('var ')) st = st.substring(4).trim();
                                const eqIndex = st.indexOf('=');
                                if (eqIndex !== -1) {
                                    let vName = st.substring(0, eqIndex).trim();
                                    let expr = st.substring(eqIndex + 1).trim();
                                    scope[vName] = this._evaluateExpr(expr, scope, config);
                                } else {
                                    let res = this._evaluateExpr(st, scope, config);
                                    if (res !== "ERROR(2): invalid syntax") {
                                        executedOutputs.push(res);
                                    }
                                }
                            }
                        }
                    } else {
                        return "ERROR(2): invalid syntax";
                    }
                }

                if (executedOutputs.length > 0) {
                    context.collectedOutputs = executedOutputs;
                    return executedOutputs[executedOutputs.length - 1];
                }

                return scope['m'] || 0;
            } catch (err) {
                return "ERROR(0): unknown error";
            }
        }

        _evaluateExpr(expr, scope, config) {
            if (!expr) return 0;
            
            expr = expr.replace(/\[/g, '(').replace(/\]/g, ')');
            expr = expr.replace(/([a-zA-Z0-9_.\(\)]+)\s*\\\s*([a-zA-Z0-9_.\(\)]+)/g, 'Math.floor(($1) / (($2) || 1))');

            const gcd = (a, b) => b === 0 ? Math.abs(a) : gcd(b, a % b);
            const lcm = (a, b) => (a === 0 || b === 0) ? 0 : Math.abs(a * b) / gcd(a, b);
            
            const wrapAngle = (val) => config.angleMode === 'deg' ? val * (Math.PI / 180) : val;
            const wrapAngleInv = (val) => config.angleMode === 'deg' ? val * (180 / Math.PI) : val;

            const MathContext = {
                sin: (v) => Math.sin(wrapAngle(v)),
                cos: (v) => Math.cos(wrapAngle(v)),
                tan: (v) => Math.tan(wrapAngle(v)),
                asin: (v) => wrapAngleInv(Math.asin(v)),
                acos: (v) => wrapAngleInv(Math.acos(v)),
                atan: (v) => wrapAngleInv(Math.atan(v)),
                abs: Math.abs,
                sqrt: Math.sqrt,
                pow: Math.pow,
                floor: Math.floor,
                ceil: Math.ceil,
                round: Math.round,
                min: Math.min,
                max: Math.max,
                gcd: gcd,
                lcm: lcm,
                sign: (v) => Math.sign(v),
                fract: (v) => v - Math.floor(v),
                random: (min = 0, max = 1) => Math.random() * (max - min) + min,
                clamp: (val, min, max) => Math.min(Math.max(val, min), max),
                lerp: (a, b, t) => a + (b - a) * t,
                PI: Math.PI,
                E: Math.E
            };

            try {
                const keys = [...Object.keys(MathContext), ...Object.keys(scope)];
                const values = [...Object.values(MathContext), ...Object.values(scope)];
                const fn = new Function(...keys, `return (${expr});`);
                const result = fn(...values);
                return (isNaN(result) || !isFinite(result)) ? 0 : result;
            } catch (e) {
                return "ERROR(2): invalid syntax";
            }
        }

        evaluateFormula(args, util) {
            const formula = Scratch.Cast.toString(args.FORMULA);

            if (formula.includes('repeat') || formula.includes('|$run|') || formula.includes('$run') || formula.includes('single')) {
                return "ERROR(1): cannot play looped in operation";
            }

            const context = {
                x: (util && util.target) ? util.target.x : 0,
                y: (util && util.target) ? util.target.y : 0,
                variables: {}
            };
            return this._parseAndExecute(formula, context);
        }

        executeDSL(args, util) {
            const formula = Scratch.Cast.toString(args.FORMULA);
            const listName = Scratch.Cast.toString(args.LIST);

            if (!util || !util.target) return;
            const target = util.target;
            const listVar = target.lookupVariableByNameAndType(listName, 'list');
            
            // Повернення Error 4, якщо список відсутній або null
            if (!listVar) {
                console.warn("ERROR(4): list not found or null");
                return;
            }

            listVar.value = [];

            let context = {
                x: target.x,
                y: target.y,
                startTime: Date.now(),
                collectedOutputs: []
            };

            this._parseAndExecute(formula, context);

            if (context.collectedOutputs && context.collectedOutputs.length > 0) {
                listVar.value = context.collectedOutputs;
            } else {
                let singleRes = this._parseAndExecute(formula, context);
                listVar.value.push(singleRes);
            }

            listVar._monitorUpToDate = false;
        }

        showLibAndSyntaxModal() {
            let existing = document.getElementById('turbowarp-math-syntax-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'turbowarp-math-syntax-modal';
            modal.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #1e1e1e; color: #fff; padding: 25px; border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 999999; width: 520px;
                font-family: Arial, sans-serif; max-height: 85vh; overflow-y: auto; line-height: 1.5;
            `;
            modal.innerHTML = `
                <h2 style="margin-top: 0; color: #4fc3f7; border-bottom: 1px solid #444; padding-bottom: 10px;">Math DSL v${EXTENSION_VERSION} Documentation</h2>
                
                <p><b>1. Settings (<code>pre{...}</code>):</b></p>
                <ul style="padding-left: 20px; color: #ddd;">
                    <li><code>pre{deg}</code> - Degrees mode for trigonometry.</li>
                    <li><code>pre{rad}</code> - Radians mode (default).</li>
                </ul>

                <p><b>2. Macros (<code>par[...]</code>):</b></p>
                <ul style="padding-left: 20px; color: #ddd;">
                    <li><code>par[repeat(N) |$run| ...]</code> - Loop execution for N iterations.</li>
                    <li><code>par[single |$run| ...]</code> - Single execution.</li>
                </ul>

                <p><b>3. Error Codes:</b></p>
                <ul style="padding-left: 20px; color: #ff8a80;">
                    <li><code>ERROR(0)</code>: Unknown error.</li>
                    <li><code>ERROR(1)</code>: Cannot run looped operations inside Reporter blocks.</li>
                    <li><code>ERROR(2)</code>: Invalid expression syntax.</li>
                    <li><code>ERROR(3)</code>: Infinite loop protection triggered.</li>
                    <li><code>ERROR(4)</code>: List not found or null.</li>
                </ul>

                <button id="close-syntax-modal" style="background: #d32f2f; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; float: right; font-weight: bold; margin-top: 15px;">Close</button>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-syntax-modal').onclick = () => modal.remove();
        }
    }

    Scratch.extensions.register(new MathFormulasExtension());
})(Scratch);
