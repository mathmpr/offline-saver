# Offline Saver
Try to save whole website offline.

## Requirements

- Node v.18 >

## Usage example

In root of project run: `node main.js -u https://ludos-paradise.ancorathemes.com/ -d 5 -no-relative`

- `-u` is the url to copy.
- `-d` is the depth of scraping, works like site map. The default limit is three (3).
- `-no-relative` if present all possible url begin with `/`. It's useful if you want to use with a domain where root is `/`. If you don't want it, just miss this option.