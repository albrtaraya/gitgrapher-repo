const { simpleGit } = require('simple-git');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { generate_graph, get_last_position } = require('./graph');
const gitlog = require("gitlog").default;

const DIR = './project';


const git = simpleGit({ baseDir: DIR });

async function get_data() {
    try {
        const branches = await new Promise((resolve, reject) => {
            git.branchLocal((err, branches) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(branches);
                }
            });
        });

        const branches_names = branches.all;

        const log_branches = [];
        for (const branch of branches_names) {
            const logs = await get_logs_branch(branch);
            const logs_unique = await show_unique_logs(branch);
            const join_logs_branches = join_logs(logs, logs_unique);
            log_branches.push({
                "branch": branch,
                "logs": join_logs_branches
            });
        }

        return log_branches;
    } catch (error) {
        console.error('|----ERROR IN THE DIRECTORY----|');
        process.exit(1); 
    }
}// get_data()

async function get_logs_branch(rama) {
    const options = {
        repo: DIR,
        number: 10000,
        branch: rama,
    };
    const commits = gitlog(options);
    return commits;
}// getLogsBranch()

async function show_unique_logs(branch) {
    const command = 'git reflog --date=local ' + branch;
    const options = { cwd: DIR };
    
    try {
        const { stdout, stderr } = await exec(command, options);
        
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return null;
        }
        
        let raws = stdout.split('\n');
        let json_history = [];
        let type = "";
        const regex = /([0-9a-f]+)\s+(\w+)@\{([^}]+)\}\s*:\s*commit:\s*([^:]+)/;
        const regex_branch = /([0-9a-f]+)\s+(\w+)@\{([^}]+)\}\s*:\s*branch:\s*([^:]+)/;
        const regex_merge = /([0-9a-f]+)\s+([^@]+)@\{([^}]+)\}\s*:\s*commit \(merge\):\s*([^:]+)/;
        const regex_initial = /([0-9a-f]+)\s+([^@]+)@\{([^}]+)\}\s*:\s*commit \(initial\):\s*([^:]+)/;
        raws.pop();
        
        raws.forEach(raw => {
            let match = raw.match(regex);
            if (match != null) {
                const date = new Date(match[3]);
                const message = match[4];
                const hash = match[1];
                json_history.push({
                    type: "commit",
                    hash: hash,
                    date: date,
                    message: message,
                })
            } else {
                if (raw.includes("branch:")) {
                    match = raw.match(regex_branch);
                    type = "created"
                } else if (raw.includes("merge")) {
                    match = raw.match(regex_merge);
                    type = "merge"
                } else if (raw.includes("initial")) {
                    match = raw.match(regex_initial);
                    type = "initial"
                }
                if (match != null) {
                    const date = new Date(match[3]);
                    const message = match[4];
                    const hash = match[1];
                    json_history.push({
                        type: type,
                        hash: hash,
                        date: date,
                        message: message,
                    })
                }
            }
        });
        
        return json_history;
    } catch (error) {
        console.error('Error al ejecutar el comando:', error);
        return null;
    }
}// show_unique_logs()

function join_logs(logs, unique){
    const logs_unique = unique.map(item => item.hash);
    const new_logs = logs.filter(item => {
        if (logs_unique.includes(item.abbrevHash)) {
          item.type = unique.find(element => element.hash === item.abbrevHash).type;
          return true;
        }
        return false;
      });
    return new_logs;
}// join_logs()

function insert_special_logs(all_logs, brach){
    const created_type = brach.logs.find(objeto => objeto.type === 'created');
    const merge_type = brach.logs.find(objeto => objeto.type === 'merge');
    if(merge_type){
        const index = all_logs.findIndex(objeto => objeto.hash_short === merge_type.abbrevHash);
        const regex = /Merge branch '([^']+)'/;
        const match = all_logs[index].message.match(regex);
        const branch_merge = match[1];
        all_logs[index].branch_merge = branch_merge;
        //console.log(all_logs[index]);
    }
    if(created_type){
        const index = all_logs.findIndex(objeto => objeto.hash_short === created_type.abbrevHash && objeto.branch === brach.branch);
        const branch_created = all_logs[index-1].branch;
        const branch_name = brach.branch;
        add_log(all_logs, index, branch_name, branch_created, all_logs[index]);
    }
}// insert_special_logs()

function add_log(logs,index,branch_name,branch_created,log){
    log.message = "["+branch_name+"] "+"Created";
    log.branch_created = branch_created;
    log.branch = branch_name;
}// add_log()

function get_order_branches(branches,logs){
    let array_order = []
    branches.forEach(branch => {
        array_order.push({
            branch: branch,
            last_position: get_last_position(branch, logs)
        });
    });
    array_order.sort((a, b) => a.last_position - b.last_position);
    return array_order;

}// get_order_branches()

// Datos del JSON proporcionado
get_data().then(data => {
    let database_log = [];
    data.forEach(branch => {
        branch.logs.forEach(log => {
            database_log.push({
                "branch": branch.branch,
                "hash_short": log.abbrevHash,
                "hash": log.hash,
                "date": log.authorDate,
                "message": log.subject,
                "files": log.files,
                "author_name": log.authorName,
            });
        });
    });
    // Oredenamos segun la fecha
    database_log.sort((a, b)=>(new Date(a.date) - new Date(b.date)));
    data.forEach(branch => {
        insert_special_logs(database_log,branch);
    });
    database_log.reverse()
    
    let branches_order= data.map(entry => entry.branch);
    branches_order = get_order_branches(branches_order,database_log);
    const branches = branches_order.map(item => item.branch);
    generate_graph(database_log, branches)
});// get_data()