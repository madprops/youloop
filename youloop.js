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

// There is a special string 'rand'
// which produces random % and/or durations

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
App.ext = "mp4"

App.get_youtube_id = function (url) {
  let split = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/)
  let id = undefined !== split[2] ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0]
  return id.length === 11 ? id : false
}

App.prepare = function () {
  if (App.instructions[0].length === 11) {
    App.id = App.instructions[0]
  } 
  else {
    App.id = get_youtube_id(App.instructions[0])

    if (!id) {
      console.info("Invalid YouTube video ID")
      process.exit(1)
    }
  }
}

App.get_cache = function () {
  let files = App.i.fs.readdirSync("downloads/")
  
  for (let file of files) {
    if (file.startsWith(App.id)) {
      let f = App.i.path.join("downloads/", file)
      App.cache = App.i.path.join(App.i.path.dirname(__filename), f)
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
    App.i.execSync(`yt-dlp -f "bestvideo+bestaudio/bestvideo" --output "downloads/%(id)s.%(ext)s" https://www.youtube.com/watch?v=${App.id}`)
    App.get_cache()

    if (!App.cache) {
      process.exit(1)
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

  for (let ins of App.instructions.slice(1)) {
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
      App.i.execSync(`ffmpeg -loglevel error -ss ${start_seconds} -t ${duration} -i ${App.cache} -y slices/${nslice}.${App.ext}`)
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
  App.i.execSync(`echo -e "${echo}" | ffmpeg -loglevel error -f concat -safe 0 -i /dev/stdin -c copy -y ${file_name}`)
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

console.info(`ID: ${App.instructions[0]}`)

App.cleanup()
App.prepare()
App.download()
App.slice()
App.render()