const canvas = document.getElementById("output");
const nes = new NES(canvas);


window.addEventListener(
  "resize",
  (e) => {
    resizeCanvas();
  },
  true
);
window.addEventListener(
  "keydown",
  (e) => {
    checkKeyMap(e);
  },
  true
);
window.addEventListener(
  "keyup",
  (e) => {
    checkKeyMap(e, true);
  },
  true
);
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  var fileReader = new FileReader();
  fileReader.onload = function () {
    if(!this.result)return;
    nes.cycle(this.result);
  };
  fileReader.readAsArrayBuffer(file);
});
document.getElementById("resetButton").addEventListener("click", (e) => {
  nes.Reset();
});
const ctrlMap1 = {
  arrowright: nes.INPUT.RIGHT,
  arrowleft: nes.INPUT.LEFT,
  arrowdown: nes.INPUT.DOWN,
  arrowup: nes.INPUT.UP,
  enter: nes.INPUT.START,
  shift: nes.INPUT.SELECT,
  z: nes.INPUT.B,
  a: nes.INPUT.A,
};
const ctrlMap2 = {
  l: nes.INPUT.RIGHT,
  j: nes.INPUT.LEFT,
  k: nes.INPUT.DOWN,
  i: nes.INPUT.UP,
  p: nes.INPUT.START,
  o: nes.INPUT.SELECT,
  t: nes.INPUT.B,
  g: nes.INPUT.A,
};
const checkKeyMap = (e, up) => {
  if (ctrlMap1[e.key.toLowerCase()] !== undefined) {
    if (up) {
      nes.keyUp(1, ctrlMap1[e.key.toLowerCase()]);
    } else {
      nes.keyDown(1, ctrlMap1[e.key.toLowerCase()]);
    }
    e.preventDefault();
  } else if (ctrlMap2[e.key.toLowerCase()] !== undefined) {
    if (up) {
      nes.keyUp(2, ctrlMap2[e.key.toLowerCase()]);
    } else {
      nes.keyDown(2, ctrlMap2[e.key.toLowerCase()]);
    }
    e.preventDefault();
    e.stopPropagation();
  }
};
resizeCanvas = () => {
  setTimeout(() => {
    let canvas = document.getElementById("output");
    const wh = window.innerHeight;
    const ww = window.innerWidth;
    const nw = 256;
    const nh = 224;
    const waspct = ww / wh;
    const naspct = nw / nh;

    if (waspct > naspct) {
      var val = wh / nh;
    } else {
      var val = ww / nw;
    }
    let ctrldiv = document.querySelector(".ctrl_div");
    canvas.style.height = 224 * val - ctrldiv.offsetHeight - 18 + "px";
    canvas.style.width = 256 * val - 24 + "px";
  }, 1200);
};
resizeCanvas();
