// YouTube has this thing where
// you hit a number and it goes to its %
// For instance 3 == 30% of the video
// Sometimes it's fun to play with those
// Making some interesting loops
// This is a way program that

// Instructions reside in instructions.txt
// The first line is the URL or ID of the video
// The next lines are pairs of the number
// plus the duration in seconds
// For instance '4 2' would mean:
// Slice starts at 40% and is 2 seconds long

// Sample instructions.txt:
// Wx6S6JPwzbU
// 1 1
// 1 1
// 1 4

// Then you just run this program
// and it will read the instructions
// create the slices and render the output
// The slices dir is emptied automatically at launch

// This works by downloading the mp3 audio of the videos
// youtube-dl is used for that
// The audio is cached to minimize downloads
// Then it uses ffmpeg to create the slices
// It detects when slices can be reused
// Then it uses sox to concatenate the slices

// Directories:
// downloads: Where youtube audio is cached
// slices: Where temporary slices are stored
// render: Where the final output gets saved
// The output file is {id}.mp3

// There is a special string 'rand'
// which produces random % and/or durations

// Dependencies
//--------------------------
// - youtube-dl
// - ffmpeg
// - sox with libsox-fmt-mp3
// -------------------------

const fs = require("fs")
const path = require("path")
const execSync = require("child_process").execSync
const lines = fs.readFileSync("instructions.txt", "utf8").trim().split("\n")
const slices = {}
const slice_list = []
let id = ""

function get_youtube_id (url) {
  let split = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/)
  let id = undefined !== split[2] ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0]
  return id.length === 11 ? id : false
}

function get_id () {
  if (lines[0].length === 11) {
    id = lines[0]
  } else {
    id = get_youtube_id(lines[0])
    if (!id) {
      console.log("Invalid YouTube video ID")
      process.exit(1)
    }
  }
}

function download () {
  if (fs.existsSync(`downloads/${id}.mp3`)) {
    console.log("Using cache...")
  } else {
    console.log("Downloading...")
    execSync(`youtube-dl -x --audio-format mp3 --output "downloads/%(id)s.%(ext)s" https://www.youtube.com/watch?v=${id}`)
  }
}

function random_float (min, max) {
  return parseFloat(Math.random() * (max - min + 1) + min.toFixed(1))
}

function slice () {
  console.log("Creating slices...")
  let total_duration = parseInt(execSync(`mp3info -p "%S\n" downloads/${id}.mp3`))
  console.log(`Total duration: ${total_duration}`)
  let nslice = 1

  for (let line of lines.slice(1)) {
    let instruction = line.trim().toLowerCase()
  
    if (!instruction) {
      continue
    }

    console.log(`Processing: ${instruction}`)
    let split = instruction.split(" ")
    let item1 = split[0].trim()
    let item2 = split[1].trim()
    let percentage = item1 === "rand" ? random_float(0, 9) : parseFloat(split[0])
    let duration = item2 === "rand" ? random_float(0.1, 5) : parseFloat(split[1])
    let slice_id = `${percentage} - ${duration}`
    
    if (slices[slice_id]) {
      console.log("Reusing slice...")
      slice_list.push(`slices/${slices[slice_id]}.mp3`)
    } else {
      let start_seconds
      if (percentage > 0) {
        if (percentage > 9) percentage = 9
        start_seconds = total_duration * ((percentage * 10) / 100)
        start_seconds = parseFloat(start_seconds.toFixed(3))
      } else {
        start_seconds = 0
      }

      console.log(`Start: ${start_seconds} seconds`)
      execSync(`ffmpeg -loglevel error -ss ${start_seconds} -t ${duration} -i downloads/${id}.mp3 slices/${nslice}.mp3`)
      slices[slice_id] = nslice
      slice_list.push(`slices/${nslice}.mp3`)
      nslice += 1
    }
  }
}

function render () {
  console.log("Rendering...")
  execSync(`sox ${slice_list.join(" ")} render/${id}.mp3`)
  console.log(`Output saved in render/${id}.mp3`)
}

function cleanup () {
  console.log("Cleaning up...")
  let files = fs.readdirSync("slices/")
  for (const file of files) {
    if (file.startsWith(".")) continue
    fs.unlinkSync(path.join("slices/", file))
  }
}

console.log(`ID: ${lines[0]}`)

cleanup()
get_id()
download()
slice()
render()