export function activateBusy() {
    const el=document.querySelector('#appbusy')
    el?.classList.remove('hidden')
}

export function deactivateBusy() {
    const el=document.querySelector('#appbusy')
    el?.classList.add('hidden')
}