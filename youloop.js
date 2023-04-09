// YouTube has this thing where
// you hit a number and it goes to its %
// For instance 3 == 30% of the video
// Sometimes it's fun to play with those
// Making some interesting loops
// This is a way program that

// Instructions reside in instructions.txt
// Each line is a pairs of numbers
// The percentage and the duration
// For instance '4 2' would mean:
// Slice starts at 40% and is 2 seconds long
// Durations might not be exact

// Sample instructions.txt:
// 1 1
// 4 5
// 2 4
// 1 2

// There is a special string "rand"
// which produces random % and/or durations:
// rand rand
// rand 1
// rand rand
// rand 3

// Then you just run this program
// and it will read the instructions
// create the slices and render the output
// The slices dir is emptied automatically at launch

// This works by downloading the youtube videos
// yt-dlp is used for that
// The video is cached to minimize downloads
// Then it uses ffmpeg to create the slices
// It detects when slices can be reused
// Then ffmpeg joins the slices into a final video

// Directories:
// downloads: Where youtube videos are cached
// slices: Where temporary slices are stored
// render: Where the final output gets saved

// Dependencies
//--------------------------
// - yt-dlp
// - ffmpeg
// -------------------------

const App = {}
App.i = {}

App.i.fs = require("fs")
App.i.path = require("path")
App.i.execSync = require("child_process").execSync
App.instructions = App.i.fs.readFileSync("instructions.txt", "utf8").trim().split("\n")
App.slices = {}
App.slice_list = []

App.exit = function () {
  process.exit(1)
}
 
App.get_youtube_id = function (url) {
  let split = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/)
  let id = undefined !== split[2] ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0]
  return id.length === 11 ? id : false
}

App.prepare = function () {
  let url = process.argv[2]

  if (!url) {
    App.exit()
  }

  if (url.length === 11) {
    App.id = url
  } 
  else {
    App.id = App.get_youtube_id(url)

    if (!App.id) {
      console.info("Invalid YouTube video ID")
      App.exit()
    }
  }

  console.info(`ID: ${App.id}`)
}

App.get_cache = function () {
  let files = App.i.fs.readdirSync("downloads/")
  
  for (let file of files) {
    if (file.startsWith(App.id)) {
      if (file.endsWith(".part") || file.endsWith(".ytdl")) {
        return
      }
      
      let f = App.i.path.join("downloads/", file)
      App.cache = App.i.path.join(App.i.path.dirname(__filename), f)
      App.ext = file.split(".").slice(-1)[0]
    }
  }  
}

App.download = function () {
  App.get_cache()

  if (App.cache) {
    console.info("Using cache...")
  } 
  else {
    console.info("Downloading...")
    App.i.execSync(`yt-dlp --output "downloads/%(id)s.%(ext)s" https://www.youtube.com/watch?v=${App.id}`)
    App.get_cache()

    if (!App.cache) {
      App.exit()
    }
  }
}

App.random_float = function (min, max) {
  return parseFloat(Math.random() * (max - min + 1) + min.toFixed(1))
}

App.slice = function () {
  console.info("Creating slices...")
  let total_duration = parseInt(App.i.execSync(`ffprobe ${App.cache} -show_format 2>&1 | sed -n 's/duration=//p'`))
  let nslice = 1

  for (let ins of App.instructions) {
    let instruction = ins.trim().toLowerCase()
  
    if (!instruction) {
      continue
    }

    console.info(`Processing: ${instruction}`)
    let split = instruction.split(" ")
    let item1 = split[0].trim()
    let item2 = split[1].trim()
    let percentage = item1 === "rand" ? App.random_float(0, 9) : parseFloat(split[0])
    let duration = item2 === "rand" ? App.random_float(0.1, 5) : parseFloat(split[1])
    let slice_id = `${percentage} - ${duration}`
    
    if (App.slices[slice_id]) {
      console.info("Reusing slice...")
      App.slice_list.push(`slices/${App.slices[slice_id]}.${App.ext}`)
    } 
    else {
      let start_seconds

      if (percentage > 0) {
        if (percentage > 9) percentage = 9
        start_seconds = total_duration * ((percentage * 10) / 100)
        start_seconds = parseFloat(start_seconds.toFixed(3))
      } 
      else {
        start_seconds = 0
      }

      console.info(`Start: ${start_seconds} seconds | Duration: ${duration}`)
      App.i.execSync(`ffmpeg -loglevel error -ss ${start_seconds} -t ${duration} -i ${App.cache} -c copy -y slices/${nslice}.${App.ext}`)
      App.slices[slice_id] = nslice
      App.slice_list.push(`slices/${nslice}.${App.ext}`)
      nslice += 1
    }
  }
}

App.render = function () {
  console.info("Rendering...")
  let paths = []
  
  for (let file of App.i.fs.readdirSync("slices/")) {
    if (file.endsWith(App.ext)) {
      let f = App.i.path.join("slices/", file)
      f = App.i.path.join(App.i.path.dirname(__filename), f)
      paths.push(f)
    }
  }

  let echo = paths.map(x => `file '${x}'`).join("\\n")
  let file_name = `render/${Date.now()}_${App.id}.${App.ext}`
  App.i.execSync(`bash -c 'echo -e "${echo}" | ffmpeg -loglevel error -f concat -safe 0 -i /dev/stdin -c copy -y ${file_name}'`)
  console.info(`Output saved in ${file_name}`)
}

App.cleanup = function () {
  console.info("Cleaning up...")
  
  for (let file of App.i.fs.readdirSync("slices/")) {
    if (file.startsWith(".")) continue
    let f = App.i.path.join("slices/", file)
    f = App.i.path.join(App.i.path.dirname(__filename), f)
    App.i.fs.unlinkSync(f)
  }
}

App.prepare()
App.cleanup()
App.download()
App.slice()
App.render()