const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CHAPTER_LIST_URL = 'http://www.nettruyen.com/truyen-tranh/huyet-ma-nhan';
const CHAPTER_START = 258;
const CHAPTER_END = 999;
const PARALLEL_DOWNLOAD = 10;

function get(url) {
  return new Promise((r, _) => {
    request(url, function (error, response, body) {
      r(body);
    });
  });
}


function download(url, path) {
  return new Promise((r, _) => {
    console.log(path);
    request(url).pipe(fs.createWriteStream(path)).on('finish', function() {
      r(true);
    });
  });
}


function pad(n, len) {
  let str = n + '';
  for (i = 0; i < len - str.length; i++) {
    str = '0' + str;
  }
  return str;
}

async function downloadFirst(folder, arr) {
  if (!arr || arr.length == 0) {
    return;
  }
  let item = arr.shift();
  let filePath = path.join(folder, `${pad(item.page, 4)}.png`);
  await download(item.url, filePath).then(_ => downloadFirst(folder, arr));
}

async function crawlChapter(chap, url) {
  let folder = path.join(__dirname, 'chapters', pad(chap, 4));
  try {
    fs.mkdirSync(folder);
  } catch (e) {}



  let html = await get(url);
  let $ = cheerio.load(html);
  let arr = $('.page-chapter img').toArray().map(img => $(img).attr('src'));

  let jobs = arr.map((img, i) => ({url: img, page: i}));
  console.log('jobs.length',jobs.length);

  var pool = [];
  for (let i = 0 ; i < PARALLEL_DOWNLOAD; i++) {
    pool.push(downloadFirst(folder, jobs));
  }
  await Promise.all(pool);

  // for (let i = 0; i < arr.length; i++) {
  //
  // }

  // let img = arr[i];
  // let filePath = path.join(folder, `${pad(i, 4)}.png`);
  // download(img, filePath).then(_ => {
  //
  // })

}

async function main() {
    let html = await get(CHAPTER_LIST_URL);
    let $ = cheerio.load(html);
    let arr = $('.list-chapter .chapter').toArray().map(dom => $(dom).find('a').attr('href')).reverse();
    for (let url of arr) {
      let ex = /chap\-(\d+)/.exec(url);
      let chap = ex[1] - 0;
      if (chap < CHAPTER_START || chap > CHAPTER_END) {
        console.log(`skip chap ${chap}`);
        continue;
      }

      console.log(`TODO: crawl chap ${chap}`);
      await crawlChapter(chap, url);

    }
}


main();
