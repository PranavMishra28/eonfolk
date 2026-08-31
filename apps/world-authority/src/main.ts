import {
	defaultWorldDirectory,
	LOCAL_WORLD_AUTHORITY_HOST,
	LOCAL_WORLD_AUTHORITY_PORT,
	LocalWorldAuthority,
} from "./kernel.js";
import { createWorldAuthorityServer } from "./server.js";

const directory = process.env.EONFOLK_WORLD_DIR ?? defaultWorldDirectory();
const authority = new LocalWorldAuthority(directory);

const server = createWorldAuthorityServer(authority);
server.listen(LOCAL_WORLD_AUTHORITY_PORT, LOCAL_WORLD_AUTHORITY_HOST, () => {
	process.stdout.write(
		`EONFOLK local world authority on http://${LOCAL_WORLD_AUTHORITY_HOST}:${String(LOCAL_WORLD_AUTHORITY_PORT)}\n`,
	);
});

void authority.start().then(
	() => void authority.runUntilStopped(),
	(error: unknown) => {
		process.stderr.write(
			`${error instanceof Error ? error.message : "world authority failed to start"}\n`,
		);
		process.exitCode = 1;
		server.close();
	},
);

const stop = () => {
	authority.stop();
	server.close();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
