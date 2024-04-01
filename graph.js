const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { Chart, registerables } = require('chart.js');
Chart.register(...registerables); 
let DEFAULT_BRANCH = 'master';
const PATH_LOGO_IMG = path.join(__dirname, 'resources', 'logo.png');
const colors = [
    '#72b8e3', '#ffac55', '#56ca6e', '#ec7276', '#b293d4',
    '#a1847c', '#f2a8d5', '#a4a4a4', '#d2d351', '#5bd5ea',
    '#b2d4f0', '#ffd2a3', '#ade8b2', '#ffb4b1', '#d8c0e1',
    '#cfaea7', '#fbd2e0', '#d7d7d7', '#e0e089', '#a7ede9',
    '#4a4c7a', '#f8d9d9', '#60abf9', '#8bf277', '#f16c73',
    '#9e499d', '#ff834d', '#c1a265', '#d2f43c', '#00c968',
    '#db326a', '#fac2cb', '#b6b6b6', '#e3e4a2', '#c3d7f3',
    '#ffd85a', '#c0eb5a', '#3596d2', '#f58735', '#a5a5a5',
    '#dbe99d', '#c3e9f7', '#f6c20b', '#89d6f2', '#ff8179',
    '#838383', '#f1f5e4', '#e7efce', '#4eb4e3', '#ffbbbb'
];

function create_branch_graph(logs, ctx, points, branch, idx, branches) {
    // Create a canvas
    let height = 29.5 * logs.length;
    const main_canvas = createCanvas(60 * branches.length, height);
    const main_ctx = main_canvas.getContext('2d');

    let point_radius = [];
    logs.forEach((log, index) => {
        if (log.branch == branch) {
            point_radius.push(colors[idx]);
        } else {
            point_radius.push('rgba(0, 0, 0, 0)');
        }
    });
    
    let last_position = get_last_position(branches[idx], logs);
    let x_point = [];
    let band = false;
    let border_style = [];
    logs.forEach((log, index) => {
        if (log.branch != branch && !band) {
            border_style.push(NaN);
        } else {
            band = true;
            border_style.push(0);
        }
        if (index <= last_position) {
            x_point.push(branches.length - idx - 1);
            if (index + 1 < logs.length) {
                if ('branch_created' in log) {
                    if (branch == log.branch && log.branch != logs[index + 1].branch) {
                        let id = branches.findIndex((branch) => branch == log.branch_created);
                        x_point[index + 1] = branches.length - id - 1;
                    }
                } else if ('branch_merge' in log) {
                    let id = branches.findIndex((branch) => branch == log.branch);
                    if (branch == log.branch_merge && log.branch != logs[index + 1].branch) {
                        x_point[index] = branches.length - id - 1;
                        border_style.push(0);
                        border_style.push(0);
                    }
                }
            }

        }
    });

    // Chart configuration
    const chartConfig = {
        type: 'line', 
        data: {
            labels: points,
            datasets: [{
                data: x_point,
                backgroundColor: 'rgba(75, 192, 192, 0)',
                borderColor: colors[idx],
                borderWidth: 4,
                pointBackgroundColor: point_radius, 
                pointBorderColor: point_radius, 
                pointRadius: 5, 
            }]
        },
        options: {
            indexAxis: 'y', 
            scales: {
                x: {
                    beginAtZero: true,
                    display: false,
                    min: -0.5,
                    max: branches.length,
                    ticks: {
                        stepSize: 1 
                    }
                },
                y: {
                    display: false,
                    position: "right",
                }
            },
            plugins: {
                legend: {
                  display: false
                }
            }
        }
    };

    // Create the chart
    new Chart(main_ctx, chartConfig);
    ctx.drawImage(main_canvas, 0, 150);
}

function print_labels(logs, labels, ctx, branches) {
    labels.forEach((log, idx) => {
        ctx.fillStyle = colors[branches.indexOf(logs[idx].branch)];
        ctx.fillText(log, 50 * branches.length, 16 + (30 * idx)+150);
    });
}

function get_last_position(branch, data) {
    let lastPosition = -1;
    for (let i = 0; i < data.length; i++) {
        if (data[i].branch === branch) {
            lastPosition = i;
        }
    }
    return lastPosition;
}

function generate_graph(logs, branches, default_branch) {
    DEFAULT_BRANCH = default_branch;
    let logs_label = [];
    let points = [];
    logs.forEach(log => {
        if (log.message.includes("[" + log.branch + "] " + "Created")) {
            logs_label.push("[" + log.branch + "]" + " " + log.hash_short + " - " + log.message+ " from [" + log.branch_created + "] branch")
        } else {
            logs_label.push("[" + log.branch + "]" + " " + log.hash_short + " - " + log.message)
        }
        points.push(0);
    });

    // Create a canvas
    const canvas = createCanvas(900, (30 * logs.length)+150+50);
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#282a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    branches.forEach((branch, idx) => {
        create_branch_graph(logs, ctx, points, branch, idx, branches);
    });

    print_labels(logs, logs_label, ctx, branches)

    // Add creator label
    ctx.fillStyle = "#757687";
    ctx.font = 'semibold 14px Roboto';
    let metrics = ctx.measureText("by: Albert Araya");
    let textWidth = metrics.width;
    ctx.fillText("by: Albert Araya", (900-textWidth)/2, (30 * logs.length)+185);

    // Add tittle label
    ctx.fillStyle = "#fff";
    ctx.font = '32px Roboto';
    metrics = ctx.measureText("Proyect Git Status");
    textWidth = metrics.width;
    ctx.fillText("Proyect git status", (900-textWidth)/2, 100);
    ctx.beginPath();
    ctx.moveTo((900-textWidth)/2, 100 + 10);
    ctx.lineTo((900-textWidth)/2 + textWidth, 100 + 10);
    ctx.strokeStyle = 'white'; // Color del subrayado
    ctx.stroke();
    
    //Load logo
    loadImage(PATH_LOGO_IMG).then((img) => {
        ctx.drawImage(img, 0, -10, 250, 96)
        // Save the graph as a PNG file
        try {
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync('gitgrapher.png', buffer);
            console.log('\x1b[32m%s\x1b[0m', 'Successfully generated graph!');
        } catch (error) {
            console.error('\x1b[31m%s\x1b[0m', "- There is no commit yet.")
        }
    })
}

module.exports = {
    generate_graph,
    get_last_position
};