import { scrub } from '../core/text.js';

/* io/paths.js: generated from the single-file build, code unchanged */


const slug=s=>scrub(s,40).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'comic';

export { slug };

