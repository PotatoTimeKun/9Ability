// Entry point
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing 9Ability...");
    PlayFabService.initPlayFab();
    const game = new Game();
    game.init();
});
