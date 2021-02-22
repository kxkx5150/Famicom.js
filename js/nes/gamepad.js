'use strict';
class GAMEPAD {
  constructor(nes) {
    this.nes = nes;
    this.selected = -1;
    this.pads = [];
    this.INPUT = {
      A: 0,
      B: 1,
      SELECT: 2,
      START: 3,
      UP: 4,
      DOWN: 5,
      LEFT: 6,
      RIGHT: 7,
    };
    this.buttonMap = {
      START: {
        no: 9,
        press: false,
      },
      SELECT: {
        no: 8,
        press: false,
      },
      A: {
        no: 1,
        press: false,
      },
      B: {
        no: 2,
        press: false,
      },
    };
    this.axesMap = {
      RIGHT: {
        no: 7,
        press: false,
      },
      LEFT: {
        no: 6,
        press: false,
      },
      DOWN: {
        no: 5,
        press: false,
      },
      UP: {
        no: 4,
        press: false,
      },
    };
    window.addEventListener("gamepadconnected", (e) => {
      this.pads[e.gamepad.index] = e.gamepad;
      if (this.selected === -1) this.selected = e.gamepad.index;
      document.getElementById("gamepad_info").textContent = "Gamepad connected ";
      document.getElementById("gamepad_name").textContent = e.gamepad.id;
    });
    this.button_info_elem = document.getElementById("gamepad_presse_button");
    this.createOptions("start_button");
    this.createOptions("select_button");
    this.createOptions("a_button");
    this.createOptions("b_button");
    this.loadValue();

    document.getElementById("start_button").addEventListener("change",this.setValue.bind(this))
    document.getElementById("select_button").addEventListener("change",this.setValue.bind(this))
    document.getElementById("a_button").addEventListener("change",this.setValue.bind(this))
    document.getElementById("b_button").addEventListener("change",this.setValue.bind(this))

  }
  loadValue(){
    let lobj = localStorage.getItem("button_settings");
    if(lobj){
      this.buttonMap = JSON.parse(lobj);
    }
    document.getElementById("start_button").value = this.buttonMap.START.no;
    document.getElementById("select_button").value = this.buttonMap.SELECT.no;
    document.getElementById("a_button").value = this.buttonMap.A.no;
    document.getElementById("b_button").value = this.buttonMap.B.no;
  }
  setValue(){
    this.buttonMap.START.no = document.getElementById("start_button").value-0
    this.buttonMap.SELECT.no = document.getElementById("select_button").value-0
    this.buttonMap.A.no = document.getElementById("a_button").value-0
    this.buttonMap.B.no = document.getElementById("b_button").value-0
    localStorage.setItem("button_settings",JSON.stringify(this.buttonMap))
  }
  createOptions(cont_id) {
    let cont = document.getElementById(cont_id)
    for (var i = 0; i < 20; i++) {
      var option = document.createElement("option");
      option.value = i;
      option.text = "Button "+i;
      cont.appendChild(option);
    }
  }
  keyDown(player, button) {
    if (player === 1) {
      this.nes.io.crntCtrlState1 |= 1 << button;
    } else if (player === 2) {
      this.nes.io.crntCtrlState2 |= 1 << button;
    }
  }
  keyUp(player, button) {
    if (player === 1) {
      this.nes.io.crntCtrlState1 &= ~(1 << button) & 0xff;
    } else if (player === 2) {
      this.nes.io.crntCtrlState2 &= ~(1 << button) & 0xff;
    }
  }
  checkAxes(axes) {
    var val = 0;
    if (axes[0] < -0.5) {
      val += 1;
    } else if (axes[0] > 0.5) {
      val += 2;
    }
    if (axes[1] < -0.5) {
      val += 4;
    } else if (axes[1] > 0.5) {
      val += 8;
    }
    if (val === 1) {
      this.checkAxesButton("UP", false);
      this.checkAxesButton("DOWN", false);
      this.checkAxesButton("RIGHT", false);
      this.checkAxesButton("LEFT", true);
    } else if (val === 2) {
      this.checkAxesButton("UP", false);
      this.checkAxesButton("DOWN", false);
      this.checkAxesButton("LEFT", false);
      this.checkAxesButton("RIGHT", true);
    } else if (val === 4) {
      this.checkAxesButton("LEFT", false);
      this.checkAxesButton("RIGHT", false);
      this.checkAxesButton("DOWN", false);
      this.checkAxesButton("UP", true);
    } else if (val === 8) {
      this.checkAxesButton("LEFT", false);
      this.checkAxesButton("RIGHT", false);
      this.checkAxesButton("UP", false);
      this.checkAxesButton("DOWN", true);
    } else if (val === 5) {
      this.checkAxesButton("RIGHT", false);
      this.checkAxesButton("DOWN", false);
      this.checkAxesButton("UP", true);
      this.checkAxesButton("LEFT", true);
    } else if (val === 6) {
      this.checkAxesButton("LEFT", false);
      this.checkAxesButton("DOWN", false);
      this.checkAxesButton("RIGHT", true);
      this.checkAxesButton("UP", true);
    } else if (val === 9) {
      this.checkAxesButton("RIGHT", false);
      this.checkAxesButton("UP", false);
      this.checkAxesButton("DOWN", true);
      this.checkAxesButton("LEFT", true);
    } else if (val === 10) {
      this.checkAxesButton("LEFT", false);
      this.checkAxesButton("UP", false);
      this.checkAxesButton("DOWN", true);
      this.checkAxesButton("RIGHT", true);
    } else {
      this.checkAxesButton("LEFT", false);
      this.checkAxesButton("RIGHT", false);
      this.checkAxesButton("UP", false);
      this.checkAxesButton("DOWN", false);
    }
  }
  checkAxesButton(name, pressed) {
    if (pressed) {
      // if (this.axesMap[name].press) return;
      this.axesMap[name].press = true;
      this.keyDown(1, this.INPUT[name]);
      return true;
    } else {
      if (this.axesMap[name].press) {
        this.axesMap[name].press = false;
        this.keyUp(1, this.INPUT[name]);
      }
    }
    return;
  }
  checkButton(name, buttons) {
    for (var i = 0; i < buttons.length; i++) {
      let btn = buttons[i];
      if(btn.pressed){
        this.button_info_elem.textContent = "Button "+i;
      }
      if (i === this.buttonMap[name].no) {
        if (btn.pressed) {
          // if (this.buttonMap[name].press) return;
          this.buttonMap[name].press = true;
          this.keyDown(1, this.INPUT[name]);
          return true;
        } else {
          if (this.buttonMap[name].press) {
            this.buttonMap[name].press = false;
            this.keyUp(1, this.INPUT[name]);
          }
        }
      }
    }
    return;
  }
  updateGamepad() {
    var pad = navigator.getGamepads()[this.selected];
    if (pad) {
      this.checkButton("START", pad.buttons);
      this.checkButton("SELECT", pad.buttons);
      this.checkAxes(pad.axes);
      this.checkButton("A", pad.buttons);
      this.checkButton("B", pad.buttons);
    }
  }
}
