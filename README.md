YouTube has this thing where

you hit a number and it goes to its %

For instance 3 == 30% of the video

Sometimes it's fun to play with those

Making some interesting loops

This is a way program that

---

Instructions reside in instructions.txt

Each line is a pairs of numbers

The percentage and the duration

For instance '4 2' would mean:

Slice starts at 40% and is 2 seconds long

Durations might not be exact

---

Sample instructions.txt:

1 1

4 5

2 4

1 2

---

There is a special string "rand"

which produces random % and/or durations:

rand rand

rand 1

rand rand

rand 3

max % is 9.9

max duration is 60

Then you just run this program

and it will read the instructions

create the slices and render the output

The slices dir is emptied automatically at launch

---

This works by downloading the youtube videos

yt-dlp is used for that

The video is cached to minimize downloads

Then it uses ffmpeg to create the slices

It detects when slices can be reused

Then ffmpeg joins the slices into a final video

---

Directories:

downloads: Where youtube videos are cached

slices: Where temporary slices are stored

render: Where the final output gets saved

---

Dependencies

- yt-dlp

- ffmpeg