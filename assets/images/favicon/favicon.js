function iconChange() {
    const frames = [
        "assets/images/favicon/favicon frames/favicon-1.png",
        "assets/images/favicon/favicon frames/favicon-2.png",
        "assets/images/favicon/favicon frames/favicon-3.png",
        "assets/images/favicon/favicon frames/favicon-4.png",
        "assets/images/favicon/favicon frames/favicon-5.png",
        "assets/images/favicon/favicon frames/favicon-6.png"
    ];
    
    let currentFrame = 0;

    setInterval(function() {
        document.getElementById("icon").href = frames[currentFrame];
        currentFrame = (currentFrame + 1) % frames.length;
    }, 100);
}

window.onload = iconChange;
