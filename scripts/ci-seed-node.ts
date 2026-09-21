import { ensureRootAccount } from "../server/auth/rootBootstrap";

await ensureRootAccount();

console.log("CI Node seed completed.");
