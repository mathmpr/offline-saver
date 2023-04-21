class Argv {

    static #argv = {};

    static build() {
        let pureArgv = process.argv.slice(2);
        let jumpIndex = -1;
        pureArgv.forEach((arg, index) => {
            if (arg.startsWith('-') || arg.startsWith('--')) {
                let value = null;
                if (jumpIndex === index) {
                    return;
                }
                if (index + 1 <= pureArgv.length) {
                    jumpIndex = index + 1;
                    value = pureArgv[jumpIndex];
                }

                if (arg.startsWith('--')) {
                    arg = arg.substring(2);
                } else {
                    arg = arg.substring(1);
                }
                Argv.#argv[arg] = {
                    value,
                    present: true
                }
            }
        });
    }

    static get(name) {
        if (Argv.#argv[name] != null) {
            return Argv.#argv[name];
        }
        return null;
    }
}

Argv.build();

module.exports = {
    argv: Argv
}