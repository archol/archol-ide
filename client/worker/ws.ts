
function initWS() {
    let ws = new WebSocket(`ws://${location.host}`);
    ws.onerror = () => console.log('WebSocket error');
    ws.onopen = () => console.log('WebSocket connection established');
    ws.onclose = () => console.log('WebSocket connection closed');
    ws.onmessage = (msg) => console.dir({ msg });
    return ws
}