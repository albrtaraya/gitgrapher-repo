const { simpleGit } = require('simple-git');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { generate_graph, get_last_position } = require('./graph');
const gitlog = require("gitlog").default;

const DIR = './';
let DEFAULT_BRANCH = 'main';

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

        const branch_names = branches.all;

        const log_branches = [];
        for (const branch of branch_names) {
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
}

async function get_logs_branch(branch) {
    const options = {
        repo: DIR,
        number: 10000,
        branch: branch,
    };
    const commits = gitlog(options);
    return commits;
}

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
        const regex_merge = /([0-9a-f]+)\s+(\w+)@\{([^}]+)\}\s*:\s*merge (\w+):\s*([^:]+)/;
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
                    type = "merge";
                    if(!match){
                        const regex_merge = /([0-9a-f]+)\s+([^@]+)@\{([^}]+)\}\s*: commit \(merge\): Merge branch '([^']+)'/;
                        match = raw.match(regex_merge);
                    }
                } else if (raw.includes("initial")) {
                    match = raw.match(regex_initial);
                    type = "initial"
                }
                if (match != null) {
                    const date = new Date(match[3]);
                    const hash = match[1];
                    if(type == "merge"){
                        const branch_merge = match[4];   
                        const message = match[5];
                        if(message){
                            json_history.push({
                                type: type,
                                branch_merge: branch_merge,
                                hash: hash,
                                date: date,
                                message: message,
                            })
                        }else{
                            const message = match[4];    
                            json_history.push({
                                type: type,
                                hash: hash,
                                date: date,
                                message: message,
                            })

                        }
                    }else{       
                        const message = match[4];                 
                        json_history.push({
                            type: type,
                            hash: hash,
                            date: date,
                            message: message,
                        })
                    }
                    if(type == "initial") {
                        const regex = /\S+\s+(\w+)\@\{.*?\}/;
                        const match = raw.match(regex);
                        const branch = match[1];
                        DEFAULT_BRANCH = branch;
                    }
                }
            }
        });

        return json_history;
    } catch (error) {
        console.error('Error executing the command:', error);
        return null;
    }
}

function join_logs(logs, unique) {
    const logs_unique = unique.map(item => item.hash);
    const new_logs = logs.filter(item => {
        if (logs_unique.includes(item.abbrevHash)) {
            const aux = unique.find(element => element.hash === item.abbrevHash)
            item.type = aux.type;
            item.branch_merge = aux.branch_merge;
            return true;
        }
        return false;
    });
    return new_logs;
}

function insert_special_logs(all_logs, branch) {
    const created_type = branch.logs.find(objeto => objeto.type === 'created');
    const merge_type_array = branch.logs.filter(objeto => objeto.type === 'merge');
    if (created_type) {
        const index = all_logs.findIndex(objeto => objeto.hash_short === created_type.abbrevHash && objeto.branch === branch.branch);
        const branch_created = all_logs[index - 1].branch;
        const branch_name = branch.branch;
        add_log(branch_name, branch_created, all_logs[index]);
    }
    if (merge_type_array.length > 0) {
        merge_type_array.forEach(merge_type => {
            const index = all_logs.findIndex(objeto => objeto.hash_short === merge_type.abbrevHash);
            let branch_merge = null;
            if(merge_type.branch_merge){
                branch_merge = merge_type.branch_merge;
                all_logs[index].message = "Merge branch '"+branch_merge+"'"
                all_logs[index].branch_merge = branch_merge;
                if(index+1<all_logs.length){
                    let aux = {...all_logs[index]}
                    all_logs[index] = all_logs[index+1];
                    all_logs[index+1] = aux;
                }
            }else{
                const regex = /Merge branch '([^']+)'/;
                const match = all_logs[index].message.match(regex);
                branch_merge = match[1];
                all_logs[index].branch_merge = branch_merge;
            }
        });
    }
}

function add_log(branch_name, branch_created, log) {
    log.message = "[" + branch_name + "] " + "Created";
    log.branch_created = branch_created;
    log.branch = branch_name;
}

function get_order_branches(branches, logs) {
    let array_order = []
    branches.forEach(branch => {
        array_order.push({
            branch: branch,
            last_position: get_last_position(branch, logs)
        });
    });
    array_order.sort((a, b) => a.last_position - b.last_position);
    return array_order;
}

// Data retrieval from the provided JSON
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
    // Sort by date
    database_log.sort((a, b) => (new Date(a.date) - new Date(b.date)));
    data.forEach(branch => {
        insert_special_logs(database_log, branch);
    });
    database_log.reverse()

    let branches_order = data.map(entry => entry.branch);
    branches_order = get_order_branches(branches_order, database_log);
    const branches = branches_order.map(item => item.branch);
    branches.sort((a, b) => {if (a === DEFAULT_BRANCH && b !== DEFAULT_BRANCH) {return 1;} else if (a !== DEFAULT_BRANCH && b === DEFAULT_BRANCH) {return -1;} else {return 0;}});
    
    generate_graph(database_log, branches, DEFAULT_BRANCH)
});