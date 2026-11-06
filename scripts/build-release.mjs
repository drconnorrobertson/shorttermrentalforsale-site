import {spawnSync} from 'node:child_process';
const steps=[['scripts/build-content.mjs'],['scripts/instrument-conversions.mjs','dist'],['scripts/brand-check.mjs','dist'],['scripts/buyer-intent-release.cjs','dist'],['scripts/practical-homepage.cjs','dist'],['scripts/brand-check.mjs','dist'],['scripts/check-indexing.mjs','dist']];
for(const args of steps){const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
