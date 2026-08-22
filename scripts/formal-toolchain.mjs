export const TLC_VERSION = "1.8.0";
export const TLC_JAR_SHA256 =
	"eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a";
export const TLC_DOWNLOAD_URL = `https://github.com/tlaplus/tlaplus/releases/download/v${TLC_VERSION}/tla2tools.jar`;

if (import.meta.url === new URL(process.argv[1], "file:").href) {
	if (process.argv[2] === "--sha256")
		process.stdout.write(`${TLC_JAR_SHA256}\n`);
	else if (process.argv[2] === "--url")
		process.stdout.write(`${TLC_DOWNLOAD_URL}\n`);
	else if (process.argv[2] === "--version")
		process.stdout.write(`${TLC_VERSION}\n`);
	else throw new Error("usage: formal-toolchain.mjs --sha256|--url|--version");
}
