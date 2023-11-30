import { buildServer } from "./scripts/server-build.js";

buildServer( config => {
	return {
		input: 'src/server/server.ts',
		output: 'dist/server.js',
		target: 'node18',
		dev: {
			command: 'node server.js --dev',
			cwd: 'dist'
		},
	}
})