
export let worker = new Worker('/js/worker/worker.js');

worker.addEventListener('message', function (e) {
    let msg = JSON.parse(e.data || '{}')
    if (msg.method == 'boot') location.reload(true)
}, false);

''.pad

worker.postMessage(JSON.stringify({ method: 'boot' }))