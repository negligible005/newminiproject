const { spawn } = require('child_process');
const fs = require('fs');

function startServer(cmd, args, logFile) {
    const out = fs.openSync(logFile, 'w');
    const err = fs.openSync(logFile, 'a');
    const proc = spawn(cmd, args, {
        detached: true,
        stdio: ['ignore', out, err]
    });
    proc.unref();
    console.log(`Started ${cmd} with args ${args.join(' ')}, logging to ${logFile}`);
}

startServer('node', ['server.js'], 'server_utf8.log');
setTimeout(() => {
    startServer('node', ['admin-server.js'], 'admin_server_utf8.log');
}, 1000);
