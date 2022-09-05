import { environment, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import { exec, execSync } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { CustomTimer, Preferences, Timer } from "./types";

const DATAPATH = environment.supportPath + "/customTimers.json";

async function startTimer(timeInSeconds: number, timerName = "Untitled") {
  const fileName = environment.supportPath + "/" + new Date().toISOString() + "---" + timeInSeconds + ".timer";
  const masterName = fileName.replace(/:/g, "__");
  writeFileSync(masterName, timerName);

  const prefs = getPreferenceValues<Preferences>();
  let command = `sleep ${timeInSeconds} && if [ -f "${masterName}" ]; then `;
  if (prefs.selectedSound === "speak_timer_name") {
    command += `say "${timerName}"`;
  } else {
    command += `afplay "${environment.assetsPath + "/" + prefs.selectedSound}"`;
  }
  command += ` && osascript -e 'display notification "'"Timer complete"'" with title "Ding!"' && rm "${masterName}"; else echo "Timer deleted"; fi`;
  exec(command, (error, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
  });
  popToRoot();
  await showHUD(`Timer "${timerName}" started for ${formatTime(timeInSeconds)}! 🎉`);
}

function stopTimer(timerFile: string) {
  const command = `if [ -f "${timerFile}" ]; then rm "${timerFile}"; else echo "Timer deleted"; fi`;
  execSync(command);
}

function getTimers() {
  const setOfTimers: Timer[] = [];
  const files = readdirSync(environment.supportPath);
  files.forEach((timerFile: string) => {
    if (extname(timerFile) == ".timer") {
      const timer: Timer = {
        name: "",
        secondsSet: -99,
        timeLeft: -99,
        originalFile: timerFile,
      };
      timer.name = readFileSync(environment.supportPath + "/" + timerFile).toString();
      const timerFileParts = timerFile.split("---");
      timer.secondsSet = Number(timerFileParts[1].split(".")[0]);
      const timeStarted = timerFileParts[0].replace(/__/g, ":");
      timer.timeLeft = Math.max(
        0,
        Math.round(timer.secondsSet - (new Date().getTime() - new Date(timeStarted).getTime()) / 1000)
      );
      setOfTimers.push(timer);
    }
  });
  setOfTimers.sort((a, b) => {
    return a.timeLeft - b.timeLeft;
  });
  return setOfTimers;
}

function renameTimer(timerFile: string, newName: string) {
  const dataPath = environment.supportPath + "/" + timerFile;
  writeFileSync(dataPath, newName);
}

function ensureCTFileExists() {
  if (!existsSync(DATAPATH)) {
    writeFileSync(DATAPATH, JSON.stringify({}));
  }
}

function createCustomTimer(newTimer: CustomTimer) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  customTimers[randomUUID()] = newTimer;
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

function readCustomTimers() {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  return customTimers;
}

function renameCustomTimer(ctID: string, newName: string) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  customTimers[ctID].name = newName;
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

function deleteCustomTimer(ctID: string) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  delete customTimers[ctID];
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${hours}:${mins}:${secs}`;
}

export {
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimers,
  readCustomTimers,
  renameTimer,
  renameCustomTimer,
  startTimer,
  stopTimer,
  formatTime,
};
