const App = {}; App.i = {}

App.i.fs = require("fs")
App.i.path = require("path")
App.i.execSync = require("child_process").execSync
App.slices = {}

App.exit = function () {
  process.exit(1)
}

App.get_path = function (dir) {
  return App.i.path.join(App.i.path.dirname(__filename), dir)
}

App.random_float = function (min, max) {
  return parseFloat(Math.random() * (max - min + 1) + min.toFixed(1))
}
 
App.get_youtube_id = function (url) {
  let split = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/)
  let id = undefined !== split[2] ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0]
  return id.length === 11 ? id : false
}

App.get_cache = function () {
  let downloads_path = App.get_path("downloads")
  let files = App.i.fs.readdirSync(downloads_path)
  
  for (let file of files) {
    if (file.startsWith(App.id)) {
      if (file.endsWith(".part") || file.endsWith(".ytdl")) {
        return
      }

      App.cache = App.i.path.join(downloads_path, file)
      App.ext = file.split(".").slice(-1)[0]
    }
  }  
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
  App.instructions = App.i.fs.readFileSync(App.get_path("instructions.txt"), "utf8").trim().split("\n")  
}

App.cleanup = function () {
  console.info("Cleaning up...")
  let slices_path = App.get_path("slices")

  for (let file of App.i.fs.readdirSync(slices_path)) {
    if (file.startsWith(".")) continue
    App.i.fs.unlinkSync(App.i.path.join(slices_path, file))
  }
}

App.download = function () {
  App.get_cache()

  if (App.cache) {
    console.info("Using cache...")
  } 
  else {
    console.info("Downloading...")
    App.i.execSync(`bash -c 'yt-dlp --output "downloads/%(id)s.%(ext)s" https://www.youtube.com/watch?v=${App.id}'`)
    App.get_cache()

    if (!App.cache || !App.ext) {
      App.exit()
    }
  }
}

App.slice = function () {
  console.info("Creating slices...")
  let total_duration = parseInt(App.i.execSync(`bash -c "ffprobe ${App.cache} -show_format 2>&1 | sed -n 's/duration=//p'"`))
  let nslice = 1
  let max_percentage = 9.9
  let max_duration = 60

  for (let ins of App.instructions) {
    let instruction = ins.trim().toLowerCase()
  
    if (!instruction) {
      continue
    }

    console.info(`Processing: ${instruction}`)

    let split = instruction.split(" ")
    let item1 = split[0].trim()
    let item2 = split[1].trim()
    let percentage = item1 === "rand" ? App.random_float(0, max_percentage) : Math.min(max_percentage, parseFloat(split[0]))
    let duration = item2 === "rand" ? App.random_float(0.25, 10) : Math.min(max_duration, parseFloat(split[1]))
    let slice_id = `${percentage} - ${duration}`
    
    if (App.slices[slice_id]) {
      console.info("Reusing slice...")
    } 
    else {
      let start_seconds

      if (percentage > 0) {
        start_seconds = total_duration * ((percentage * 10) / 100)
        start_seconds = parseFloat(start_seconds.toFixed(3))
      } 
      else {
        start_seconds = 0
      }

      console.info(`Start: ${start_seconds} seconds | Duration: ${duration}`)
      App.i.execSync(`bash -c 'ffmpeg -loglevel error -ss ${start_seconds} -t ${duration} -i ${App.cache} -c copy -y slices/${nslice}.${App.ext}'`)
      App.slices[slice_id] = nslice
      nslice += 1
    }
  }
}

App.render = function () {
  console.info("Rendering...")

  let paths = []
  let slices_path = App.get_path("slices")

  for (let file of App.i.fs.readdirSync(slices_path)) {
    if (file.endsWith(App.ext)) {
      paths.push(App.i.path.join(slices_path, file))
    }
  }

  let echo = paths.map(x => `file '${x}'`).join("\\n")
  let file_name = `render/${Date.now()}_${App.id}.${App.ext}`
  App.i.execSync(`bash -c 'echo -e "${echo}" | ffmpeg -loglevel error -f concat -safe 0 -i /dev/stdin -c copy -y ${file_name}'`)
  console.info(`Output saved in ${file_name}`)
}

App.prepare()
App.cleanup()
App.download()
App.slice()
App.render()