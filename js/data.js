/* ============================================================
   Bible Commentaries - data layer
   Public-domain commentary / church-history metadata +
   provider-aware fetching, with IndexedDB caching.
   Providers:
     ocd      Open Christian Data commentary folders (per-book JSON + manifest)
     haydock  Haydock Catholic Commentary (catholic-bible repo, jsDelivr CDN)
     catena   Catena Aurea (Aquinas, tr. Newman) - JSONL pericopes
     ocdf     OCD church-fathers files (scripture-linked quotations)
     history  OCD structured-text files (continuous early church histories)
   ============================================================ */
'use strict';

const RAW     = 'https://raw.githubusercontent.com/OpenChristianData/open-christian-data/main';
const HAYDOCK = 'https://cdn.jsdelivr.net/gh/ronaldoscotti/catholic-bible@v2.0.0/data/commentary/haydock/books';
const CATENA  = 'https://raw.githubusercontent.com/AlvaroBalbin/catena/main/data/catena';

const COMMENTARIES = [
  /* --- protestant classics (OCD commentary folders) --- */
  { id:'matthew-henry', title:'Matthew Henry\u2019s Complete Commentary on the Whole Bible', author:'Matthew Henry', year:1706, era:'Puritan devotional classic', desc:'The most widely loved devotional-practical commentary ever written in English. Verse-by-verse exposition full of devotion and practical application \u2014 the classic companion for weekday devotions and sermon preparation.', tradition:['Reformed','Puritan'] },
  { id:'john-gill', title:'Exposition of the Old and New Testament', author:'John Gill', year:1748, era:'18th century Baptist', desc:'A monumental 8-volume work by the eminently learned Dr. Gill \u2014 line upon line, with original-language insights, Rabbinical references, and careful doctrinal exposition of the whole Bible.', tradition:['Reformed','Baptist'] },
  { id:'barnes', title:'Notes, Explanatory and Practical on the Bible', author:'Albert Barnes', year:1834, era:'19th century Presbyterian', desc:'Albert Barnes\u2019 famous notes throw a clear light on the text \u2014 historical background, grammar, and practical remarks, written for Sunday-school teachers and family reading.', tradition:['Reformed','Presbyterian'] },
  { id:'adam-clarke', title:'The Holy Bible, with a Commentary and Critical Notes', author:'Adam Clarke', year:1831, era:'18th\u201319th c. Wesleyan', desc:'Adam Clarke\u2019s critical commentary \u2014 a titan of Methodism. Rich in Hebrew and Greek learning, antiquarian erudition, and wide-ranging archaeological notes for its age.', tradition:['Wesleyan','Methodist'] },
  { id:'calvin', title:'Commentaries by John Calvin', author:'John Calvin', year:1555, era:'Reformation', desc:'Calvin\u2019s matchless commentaries \u2014 lean, luminous, and relentlessly pointed at the text. One of the most influential expositors in church history.', tradition:['Reformed','Calvinist'] },
  { id:'jamieson-fausset-brown', title:'A Commentary, Critical and Explanatory, on the Whole Bible', author:'J. Jamieson \u00b7 A. Fausset \u00b7 D. Brown', year:1871, era:'Victorian critical-conservative', desc:'A concise, critical, explanatory companion built by three conservative Scottish scholars \u2014 fast to consult, reliable, and saturated in the historic Protestant interpretation.', tradition:['Reformed'] },
  { id:'keil-delitzsch', title:'Biblical Commentary on the Old Testament', author:'C. F. Keil & F. Delitzsch', year:1878, era:'19th century Lutheran', desc:'The standard conservative German Old-Testament commentary \u2014 philology, structure, and theology of the Hebrew text, with careful handling of every book from Joshua to Kings.', tradition:['Lutheran'] },
  { id:'treasury-of-david', title:'The Treasury of David', author:'Charles H. Spurgeon', year:1870, era:'Victorian Baptist', desc:'Spurgeon\u2019s magnum opus on the Psalms \u2014 expositions, counsels, quotations from the fathers and reformers, and Spurgeon\u2019s own sparkling remarks on every verse.', tradition:['Baptist'] },
  { id:'wesley', title:'Explanatory Notes upon the Whole Bible', author:'John Wesley', year:1765, era:'18th century Methodist', desc:'Wesley\u2019s own terse, tinder-dry notes \u2014 the field-preacher\u2019s pocket commentary. Sharp, spiritual, and astonishingly economical.', tradition:['Methodist','Arminian'] },
  { id:'expositors-bible', title:'The Expositor\u2019s Bible', author:'W. R. Nicoll (editor)', year:1900, era:'Victorian pulpit lectures', desc:'A multi-volume set by Handley Moule, Marcus Dods, Alexander Maclaren and others \u2014 devotional lectures on nearly every book of the Bible, polished for the pulpit.', tradition:['Evangelical'] },
  { id:'robertson-word-pictures-vol1', title:'Word Pictures in the New Testament - Volume I', author:'A. T. Robertson', year:1930, era:'Modern Greek scholar', desc:'Robertson\u2019s grammatical-syntactical word pictures from the Gospels \u2014 the great Southern Baptist exegete unpacks the Greek text in plain, vivid English.', tradition:['Baptist'] },
  { id:'lightfoot-colossians-philemon', title:'St. Paul\u2019s Epistles to the Colossians and to Philemon', author:'J. B. Lightfoot', year:1875, era:'Cambridge critical', desc:'The classic Cambridge commentary by Bishop Lightfoot on the Colossian heresy and the Epistle to Philemon, with space for every difficulty.', tradition:['Anglican'] },

  /* --- catholic / orthodox (separate providers) --- */
  { id:'haydock', title:'The Holy Bible \u2014 Haydock Catholic Commentary', author:'George Leo Haydock', year:1859, era:'Catholic Bible commentary', desc:'The beloved Catholic family commentary on the whole Bible including the deuterocanonical books \u2014 patristic and practical notes drawing on St. Jerome, St. Augustine, St. Thomas and the Fathers in a single, reverent voice.', tradition:['Catholic'], provider:'haydock' },
  { id:'catena-aurea', title:'Catena Aurea \u2014 Commentary on the Four Gospels', author:'Thomas Aquinas', year:1263, era:'Catholic medieval patristic', desc:'St. Thomas\u2019 golden chain on the Gospels \u2014 the profoundest passages of the Church Fathers woven together verse by verse, in Newman\u2019s classic 1841 translation.', tradition:['Catholic','Patristic'], provider:'catena', file:'_gospel' },
  { id:'theophylact-of-ohrid', title:'The Explanation of the New Testament', author:'Theophylact of Ohrid', year:1100, era:'Orthodox Byzantine exegesis', desc:'The great Byzantine exegete Theophylact, archbishop of Ohrid \u2014 the voice of the undivided Church\u2019s commentary tradition passed into Orthodoxy\u2019s most beloved New-Testament explanations.', tradition:['Orthodox'], provider:'ocdf', file:'theophylact-of-ohrid.json' },
  { id:'john-chrysostom', title:'Homilies & Expositions on Scripture', author:'John Chrysostom', year:400, era:'Orthodox golden-mouthed father', desc:'The golden-mouthed archbishop of Constantinople, the most quoted of all Eastern fathers \u2014 burning, vivid expositions linked to nearly every book of the Bible.', tradition:['Orthodox'], provider:'ocdf', file:'john-chrysostom.json' },

  /* --- the Fathers on Scripture (OCD scripture-linked quotes) --- */
  { id:'augustine-of-hippo', title:'Expositions, Homilies & Exposition of the Psalms', author:'Augustine of Hippo', year:410, era:'Doctor of grace', desc:'The bishop of Hippo, the most influential theologian of the West \u2014 his expositions of the Psalms and tractates on John run from here well into the next life, deep and full of love.', tradition:['Church Fathers','Catholic'], provider:'ocdf', file:'augustine-of-hippo.json' },
  { id:'bede', title:'Commentaries on Luke, Mark, Acts & the Catholic Epistles', author:'Bede the Venerable', year:724, era:'Father of English history', desc:'The Venerable Bede, the first English scholar \u2014 a patient, faithful commentator who gathered the whole tradition of the Fathers into clear notes on the apostolic books.', tradition:['Church Fathers','Anglican'], provider:'ocdf', file:'bede.json' },
  { id:'origen-of-alexandria', title:'Commentaries & Fragments on Scripture', author:'Origen of Alexandria', year:230, era:'Master of allegory', desc:'The great Alexandrian \u2014 the most learned and prolific exegete of the early church \u2014 his commentaries and homilies preserved across nearly the whole Bible.', tradition:['Church Fathers','Orthodox'], provider:'ocdf', file:'origen-of-alexandria.json' },
  { id:'cyril-of-alexandria', title:'Commentaries on the Gospels and Prophets', author:'Cyril of Alexandria', year:430, era:'Doctor of the Incarnation', desc:'The patriarch of Alexandria, champion of the Nicene faith \u2014 his great commentaries on the Gospel of John and Luke defend the divinity of Christ on every page.', tradition:['Church Fathers','Orthodox'], provider:'ocdf', file:'cyril-of-alexandria.json' },
  { id:'theodoret-of-cyrus', title:'Commentaries on the Prophets, Psalms & Epistles', author:'Theodoret of Cyrus', year:450, era:'Antiochian exegete', desc:'The learned bishop of Cyrrhus, last great Antiochene interpreter \u2014 sober, historical exposition of the prophets, the Psalms and the Pauline epistles.', tradition:['Church Fathers','Orthodox'], provider:'ocdf', file:'theodoret-of-cyrus.json' },
  { id:'oecumenius', title:'Commentary on Acts, Hebrews & Revelation', author:'Oecumenius of Tricca', year:990, era:'Byzantine commentator', desc:'The earliest surviving Byzantine commentator on Revelation \u2014 mystical and apostolic notes on Acts, Hebrews, the Catholic epistles and the Apocalypse.', tradition:['Church Fathers','Catholic'], provider:'ocdf', file:'oecumenius.json' },
  { id:'ambrosiaster', title:'Commentary on the Pauline Epistles', author:'Ambrosiaster (Pseudo-Ambrose)', year:380, era:'Early Latin exegete', desc:'The anonymous \u201cAmbrose\u2019-star\u201d of the fourth-century West \u2014 the oldest complete Latin commentary on the Pauline epistles, so penetrating that even Erasmus admired him.', tradition:['Church Fathers','Catholic'], provider:'ocdf', file:'ambrosiaster.json' },
  { id:'hilary-of-poitiers', title:'Commentary on the Gospel of Matthew', author:'Hilary of Poitiers', year:360, era:'Athanasius of the West', desc:'Hilary\u2019s commentary on Matthew \u2014 the first Latin verse-by-verse Gospel commentary that survives, written by the great defender of Nicaea in Gaul.', tradition:['Church Fathers','Catholic'], provider:'ocdf', file:'hilary-of-poitiers.json' },
  { id:'andreas-of-caesarea', title:'Commentary on the Apocalypse', author:'Andrew of Caesarea', year:610, era:'Byzantine apocalyptic exegesis', desc:'The classic Eastern commentary on Revelation \u2014 sober, orderly and much-loved in the Greek church, drawing on Methodius, Irenaeus and Origen.', tradition:['Church Fathers','Orthodox'], provider:'ocdf', file:'andreas-of-caesarea.json' },

  /* --- early church history (OCD structured-text) --- */
  { id:'eusebius-church-history', title:'Church History (Historia Ecclesiastica)', author:'Eusebius of Caesarea', year:313, era:'Early church history', desc:'The father of church history. Eusebius preserves the martyrs, teachers, heretics and apostolic succession of the first three centuries, from the archives of his own day.', tradition:['History'], category:'history', provider:'history', file:'eusebius-ecclesiastical-history.json' },
  { id:'socrates-ecclesiastical-history', title:'Ecclesiastical History', author:'Socrates Scholasticus', year:440, era:'Early church history', desc:'Socrates of Constantinople continues the story through the fourth and fifth centuries \u2014 the age of Constantine through the great councils, told by a careful lay historian.', tradition:['History'], category:'history', provider:'history', file:'socrates-ecclesiastical-history.json' },
  { id:'sozomen-ecclesiastical-history', title:'Ecclesiastical History', author:'Sozomen (Salaminius Hermias)', year:440, era:'Early church history', desc:'A lawyer of Constantinople who wrote a companion history to Socrates \u2014 with the same pageant of councils, heresies and holy men, enriched from Palestinian and monastic sources.', tradition:['History'], category:'history', provider:'history', file:'sozomen-ecclesiastical-history.json' },
  { id:'schaff-history-of-the-christian-church', title:'History of the Christian Church', author:'Philip Schaff', year:1882, era:'Early church history', desc:'Schaff\u2019s classic history \u2014 the apostolic age, the ante-Nicene church under persecution, and the triumph of Nicene orthodoxy. The standard one-volume survey of the church\u2019s first six centuries.', tradition:['History'], category:'history', provider:'history' },

  /* --- more commentaries in OCD structured-text form --- */
  { id:'ryle-expository-thoughts-matthew', title:'Expository Thoughts on the Gospel of Matthew', author:'J. C. Ryle', year:1856, era:'Evangelical Anglican exposition', desc:'Ryle\u2019s beloved devotional Bible commentary \u2014 a chapter-by-chapter walk through the first Gospel in his warm, plain, homiletic voice.', tradition:['Reformed','Anglican'], category:'history', provider:'history', file:'ryle-expository-thoughts-matthew.json' },
  { id:'luther-commentary-on-galatians', title:'Commentary on Galatians', author:'Martin Luther', year:1535, era:'The Reformation\u2019s great commentary', desc:'Luther at his best \u2014 the 1535 lectures on Galatians, \u201cmy Katie von Bora\u201d commentary on Christian liberty, grace against every legalism. The trumpet of the Reformation.', tradition:['Lutheran','Reformed'], category:'history', provider:'history', file:'luther-commentary-on-galatians.json' }
];

/* Canonical 66-book ordering with public-domain data filenames. */
const BOOKS = [
  {n:'Genesis',f:'genesis.json',c:50},{n:'Exodus',f:'exodus.json',c:40},{n:'Leviticus',f:'leviticus.json',c:27},
  {n:'Numbers',f:'numbers.json',c:36},{n:'Deuteronomy',f:'deuteronomy.json',c:34},{n:'Joshua',f:'joshua.json',c:24},
  {n:'Judges',f:'judges.json',c:21},{n:'Ruth',f:'ruth.json',c:4},{n:'1 Samuel',f:'1-samuel.json',c:31},
  {n:'2 Samuel',f:'2-samuel.json',c:22},{n:'1 Kings',f:'1-kings.json',c:22},{n:'2 Kings',f:'2-kings.json',c:25},
  {n:'1 Chronicles',f:'1-chronicles.json',c:29},{n:'2 Chronicles',f:'2-chronicles.json',c:36},{n:'Ezra',f:'ezra.json',c:10},
  {n:'Nehemiah',f:'nehemiah.json',c:13},{n:'Esther',f:'esther.json',c:10},{n:'Job',f:'job.json',c:42},
  {n:'Psalms',f:'psalms.json',c:150},{n:'Proverbs',f:'proverbs.json',c:31},{n:'Ecclesiastes',f:'ecclesiastes.json',c:12},
  {n:'Song of Solomon',f:'song-of-solomon.json',c:8},{n:'Isaiah',f:'isaiah.json',c:67},{n:'Jeremiah',f:'jeremiah.json',c:52},
  {n:'Lamentations',f:'lamentations.json',c:5},{n:'Ezekiel',f:'ezekiel.json',c:48},{n:'Daniel',f:'daniel.json',c:12},
  {n:'Hosea',f:'hosea.json',c:14},{n:'Joel',f:'joel.json',c:3},{n:'Amos',f:'amos.json',c:9},
  {n:'Obadiah',f:'obadiah.json',c:1},{n:'Jonah',f:'jonah.json',c:1},{n:'Micah',f:'micah.json',c:7},
  {n:'Nahum',f:'nahum.json',c:3},{n:'Habakkuk',f:'habakkuk.json',c:3},{n:'Zephaniah',f:'zephaniah.json',c:3},
  {n:'Haggai',f:'haggai.json',c:2},{n:'Zechariah',f:'zechariah.json',c:14},{n:'Malachi',f:'malachi.json',c:4},
  {n:'Matthew',f:'matthew.json',c:28},{n:'Mark',f:'mark.json',c:16},{n:'Luke',f:'luke.json',c:24},
  {n:'John',f:'john.json',c:21},{n:'Acts',f:'acts.json',c:28},{n:'Romans',f:'romans.json',c:16},
  {n:'1 Corinthians',f:'1-corinthians.json',c:16},{n:'2 Corinthians',f:'2-corinthians.json',c:13},{n:'Galatians',f:'galatians.json',c:6},
  {n:'Ephesians',f:'ephesians.json',c:6},{n:'Philippians',f:'philippians.json',c:4},{n:'Colossians',f:'colossians.json',c:4},
  {n:'1 Thessalonians',f:'1-thessalonians.json',c:5},{n:'2 Thessalonians',f:'2-thessalonians.json',c:3},{n:'1 Timothy',f:'1-timothy.json',c:6},
  {n:'2 Timothy',f:'2-timothy.json',c:4},{n:'Titus',f:'titus.json',c:3},{n:'Philemon',f:'philemon.json',c:1},
  {n:'Hebrews',f:'hebrews.json',c:13},{n:'James',f:'james.json',c:5},{n:'1 Peter',f:'1-peter.json',c:5},
  {n:'2 Peter',f:'2-peter.json',c:3},{n:'1 John',f:'1-john.json',c:5},{n:'2 John',f:'2-john.json',c:1},
  {n:'3 John',f:'3-john.json',c:1},{n:'Jude',f:'jude.json',c:1},{n:'Revelation',f:'revelation.json',c:22}
];
const BOOK_IDX = new Map(BOOKS.map((b,i)=>[b.n,i]));

/* Catholic canon (73 books, Douay-Rheims / Haydock). [code, name, deuterocanon].
   Order matches the Haydock provider's book_codes. */
const CATHOLIC_BOOKS = [
  ['GEN','Genesis',0],['EXO','Exodus',0],['LEV','Leviticus',0],['NUM','Numbers',0],
  ['DEU','Deuteronomy',0],['JOS','Joshua',0],['JDG','Judges',0],['RUT','Ruth',0],
  ['1SA','1 Samuel',0],['2SA','2 Samuel',0],['1KI','1 Kings',0],['2KI','2 Kings',0],
  ['1CH','1 Chronicles',0],['2CH','2 Chronicles',0],['EZR','Ezra',0],['NEH','Nehemiah',0],
  ['TOB','Tobit',1],['JDT','Judith',1],['EST','Esther',1],['1MA','1 Maccabees',1],
  ['2MA','2 Maccabees',1],['JOB','Job',0],['PSA','Psalms',0],['PRO','Proverbs',0],
  ['ECC','Ecclesiastes',0],['SNG','Song of Solomon',0],['WIS','Wisdom',1],
  ['SIR','Sirach (Ecclesiasticus)',1],['ISA','Isaiah',0],['JER','Jeremiah',0],
  ['LAM','Lamentations',0],['BAR','Baruch',1],['EZK','Ezekiel',0],['DAN','Daniel',1],
  ['HOS','Hosea',0],['JOL','Joel',0],['AMO','Amos',0],['OBA','Obadiah',0],['JON','Jonah',0],
  ['MIC','Micah',0],['NAM','Nahum',0],['HAB','Habakkuk',0],['ZEP','Zephaniah',0],
  ['HAG','Haggai',0],['ZEC','Zechariah',0],['MAL','Malachi',0],['MAT','Matthew',0],
  ['MRK','Mark',0],['LUK','Luke',0],['JHN','John',0],['ACT','Acts',0],['ROM','Romans',0],
  ['1CO','1 Corinthians',0],['2CO','2 Corinthians',0],['GAL','Galatians',0],
  ['EPH','Ephesians',0],['PHP','Philippians',0],['COL','Colossians',0],
  ['1TH','1 Thessalonians',0],['2TH','2 Thessalonians',0],['1TI','1 Timothy',0],
  ['2TI','2 Timothy',0],['TIT','Titus',0],['PHM','Philemon',0],['HEB','Hebrews',0],
  ['JAS','James',0],['1PE','1 Peter',0],['2PE','2 Peter',0],['1JN','1 John',0],
  ['2JN','2 John',0],['3JN','3 John',0],['JUD','Jude',0],['REV','Revelation',0]
];
const CATHOLIC_ORDER = new Map(CATHOLIC_BOOKS.map(([,n],i)=>[n,i]));
const OSIS_NAME = new Map(CATHOLIC_BOOKS.map(([code,n])=>[code,n]));

/* Some works in the various providers ship no manifest (or use a single
   whole-work file).  These tables reconstruct the book list. Entry shape:
   [canonicalName, filename, chapterCount?].  f==='_all' means the data file
   for the work contains every "book" and is filtered at normalize time. */
const _B = arr => arr.map(([n,f,c])=>({ name:n, f:(f||''), ch:c }));
const BOOK_OVERRIDES = {
  barnes: _B([['1 Corinthians','1-corinthians.json'],['1 John','1-john.json'],['1 Peter','1-peter.json'],['1 Thessalonians','1-thessalonians.json'],['1 Timothy','1-timothy.json'],['2 Corinthians','2-corinthians.json'],['2 John','2-john.json'],['2 Peter','2-peter.json'],['2 Thessalonians','2-thessalonians.json'],['2 Timothy','2-timothy.json'],['3 John','3-john.json'],['Acts','acts.json'],['Colossians','colossians.json'],['Ephesians','ephesians.json'],['Galatians','galatians.json'],['Hebrews','hebrews.json'],['James','james.json'],['John','john.json'],['Jude','jude.json'],['Luke','luke.json'],['Mark','mark.json'],['Matthew','matthew.json'],['Philemon','philemon.json'],['Philippians','philippians.json'],['Revelation','revelation.json'],['Romans','romans.json'],['Titus','titus.json']]),
  calvin: _B([['1 Corinthians','1-corinthians.json'],['1 John','1-john.json'],['1 Peter','1-peter.json'],['1 Thessalonians','1-thessalonians.json'],['1 Timothy','1-timothy.json'],['2 Corinthians','2-corinthians.json'],['2 Peter','2-peter.json'],['2 Thessalonians','2-thessalonians.json'],['2 Timothy','2-timothy.json'],['Acts','acts.json'],['Amos','amos.json'],['Colossians','colossians.json'],['Daniel','daniel.json'],['Deuteronomy','deuteronomy.json'],['Ephesians','ephesians.json'],['Exodus','exodus.json'],['Ezekiel','ezekiel.json'],['Galatians','galatians.json'],['Genesis','genesis.json'],['Habakkuk','habakkuk.json'],['Haggai','haggai.json'],['Hebrews','hebrews.json'],['Hosea','hosea.json'],['Isaiah','isaiah.json'],['James','james.json'],['Jeremiah','jeremiah.json'],['Joel','joel.json'],['John','john.json'],['Jonah','jonah.json'],['Joshua','joshua.json'],['Jude','jude.json'],['Lamentations','lamentations.json'],['Leviticus','leviticus.json'],['Luke','luke.json'],['Malachi','malachi.json'],['Mark','mark.json'],['Matthew','matthew.json'],['Micah','micah.json'],['Nahum','nahum.json'],['Numbers','numbers.json'],['Obadiah','obadiah.json'],['Philemon','philemon.json'],['Philippians','philippians.json'],['Psalms','psalms.json'],['Romans','romans.json'],['Titus','titus.json'],['Zechariah','zechariah.json'],['Zephaniah','zephaniah.json']]),
  'expositors-bible': _B([['1 Chronicles','1chr.json'],['1 Corinthians','1cor.json'],['1 Kings','1kgs.json'],['1 Samuel','1sam.json'],['1 Thessalonians','1thess.json'],['1 Timothy','1tim.json'],['2 Corinthians','2cor.json'],['2 Kings','2kgs.json'],['2 Peter','2pet.json'],['2 Samuel','2sam.json'],['2 Thessalonians','2thess.json'],['2 Timothy','2tim.json'],['Acts','acts.json'],['Amos','amos.json'],['Colossians','col.json'],['Daniel','dan.json'],['Deuteronomy','deut.json'],['Ephesians','eph.json'],['Esther','esth.json'],['Exodus','exod.json'],['Ezekiel','ezek.json'],['Ezra','ezra.json'],['Galatians','gal.json'],['Genesis','gen.json'],['Hebrews','heb.json'],['Hosea','hos.json'],['Isaiah','isa.json'],['James','jas.json'],['Jeremiah','jer.json'],['Job','job.json'],['John','john.json'],['Joshua','josh.json'],['Jude','jude.json'],['Judges','judg.json'],['Lamentations','lam.json'],['Leviticus','lev.json'],['Luke','luke.json'],['Mark','mark.json'],['Matthew','matt.json'],['Micah','mic.json'],['Nehemiah','neh.json'],['Numbers','num.json'],['Proverbs','prov.json'],['Psalms','ps.json'],['Revelation','rev.json'],['Romans','rom.json'],['Ruth','ruth.json'],['Song of Solomon','song.json'],['Titus','titus.json']]),
  wesley: _B([['1 Chronicles','1-chronicles.json'],['1 Corinthians','1-corinthians.json'],['1 John','1-john.json'],['1 Peter','1-peter.json'],['1 Samuel','1-samuel.json'],['1 Thessalonians','1-thessalonians.json'],['1 Timothy','1-timothy.json'],['2 Chronicles','2-chronicles.json'],['2 Corinthians','2-corinthians.json'],['2 John','2-john.json'],['2 Kings','2-kings.json'],['2 Peter','2-peter.json'],['2 Samuel','2-samuel.json'],['2 Thessalonians','2-thessalonians.json'],['2 Timothy','2-timothy.json'],['3 John','3-john.json'],['Acts','acts.json'],['Amos','amos.json'],['Colossians','colossians.json'],['Daniel','daniel.json'],['Deuteronomy','deuteronomy.json'],['Ecclesiastes','ecclesiastes.json'],['Ephesians','ephesians.json'],['Esther','esther.json'],['Exodus','exodus.json'],['Ezekiel','ezekiel.json'],['Ezra','ezra.json'],['Galatians','galatians.json'],['Genesis','genesis.json'],['Habakkuk','habakkuk.json'],['Haggai','haggai.json'],['Hebrews','hebrews.json'],['Hosea','hosea.json'],['Isaiah','isaiah.json'],['James','james.json'],['Jeremiah','jeremiah.json'],['Job','job.json'],['Joel','joel.json'],['John','john.json'],['Jonah','jonah.json'],['Joshua','joshua.json'],['Jude','jude.json'],['Judges','judges.json'],['Lamentations','lamentations.json'],['Leviticus','leviticus.json'],['Luke','luke.json'],['Malachi','malachi.json'],['Mark','mark.json'],['Matthew','matthew.json'],['Micah','micah.json'],['Nahum','nahum.json'],['Nehemiah','nehemiah.json'],['Numbers','numbers.json'],['Obadiah','obadiah.json'],['Philippians','philippians.json'],['Proverbs','proverbs.json'],['Psalms','psalms.json'],['Revelation','revelation.json'],['Romans','romans.json'],['Ruth','ruth.json'],['Song of Solomon','song-of-solomon.json'],['Titus','titus.json'],['Zechariah','zechariah.json'],['Zephaniah','zephaniah.json']]),
  'robertson-word-pictures-vol1': _B([['Matthew','matt.json'],['Mark','mark.json']]),
  'lightfoot-colossians-philemon': _B([['Colossians','colossians.json'],['Philemon','philemon.json']]),

  /* haydock: whole Catholic canon, per-book files keyed by USFM code */
  haydock: _B(CATHOLIC_BOOKS.map(([code,name])=>[name, code+'.json'])),

  /* catena aurea: one JSONL pericope file per gospel */
  'catena-aurea': _B([['Matthew','matthew.jsonl'],['Mark','mark.jsonl'],['Luke','luke.jsonl'],['John','john.jsonl']]),

  /* orth doctrine: one whole-work church-fathers file, filtered per canonical book */
  'theophylact-of-ohrid': _B([['Matthew','_all'],['Mark','_all'],['Luke','_all'],['John','_all'],['Acts','_all'],['Romans','_all'],['1 Corinthians','_all'],['2 Corinthians','_all'],['Galatians','_all'],['Ephesians','_all'],['Philippians','_all'],['Colossians','_all'],['1 Thessalonians','_all'],['2 Thessalonians','_all'],['1 Timothy','_all'],['2 Timothy','_all'],['Titus','_all'],['Philemon','_all'],['Hebrews','_all'],['James','_all'],['1 Peter','_all'],['2 Peter','_all'],['1 John','_all'],['2 John','_all'],['3 John','_all'],['Jude','_all']]),
  'john-chrysostom': _B([['Genesis','_all'],['Exodus','_all'],['Leviticus','_all'],['Numbers','_all'],['Deuteronomy','_all'],['Joshua','_all'],['Judges','_all'],['1 Samuel','_all'],['2 Samuel','_all'],['1 Kings','_all'],['2 Kings','_all'],['1 Chronicles','_all'],['2 Chronicles','_all'],['Job','_all'],['Psalms','_all'],['Proverbs','_all'],['Ecclesiastes','_all'],['Song of Solomon','_all'],['Isaiah','_all'],['Jeremiah','_all'],['Lamentations','_all'],['Ezekiel','_all'],['Daniel','_all'],['Hosea','_all'],['Joel','_all'],['Amos','_all'],['Jonah','_all'],['Micah','_all'],['Nahum','_all'],['Habakkuk','_all'],['Zephaniah','_all'],['Zechariah','_all'],['Malachi','_all'],['Matthew','_all'],['Mark','_all'],['Luke','_all'],['John','_all'],['Acts','_all'],['Romans','_all'],['1 Corinthians','_all'],['2 Corinthians','_all'],['Galatians','_all'],['Ephesians','_all'],['Philippians','_all'],['Colossians','_all'],['1 Thessalonians','_all'],['2 Thessalonians','_all'],['1 Timothy','_all'],['2 Timothy','_all'],['Titus','_all'],['Philemon','_all'],['Hebrews','_all'],['James','_all'],['1 Peter','_all'],['2 Peter','_all'],['1 John','_all'],['Jude','_all']]),

  /* early church histories: OCD structured-text files */
  'eusebius-church-history': _B([
    ['Prolegomena','_all',3],['Book I','_all',13],['Book II','_all',27],['Book III','_all',39],
    ['Book IV','_all',30],['Book V','_all',29],['Book VI','_all',46],['Book VII','_all',33],
    ['Book VIII','_all',18],['The Martyrs of Palestine','_all',14],['Book IX','_all',11],['Book X','_all',9]
 ]),
  'socrates-ecclesiastical-history': _B([
    ['Introduction','_all',4],['Book I','_all',40],['Book II','_all',47],['Book III','_all',26],
    ['Book IV','_all',38],['Book V','_all',27],['Book VI','_all',24],['Book VII','_all',48]
  ]),
  'sozomen-ecclesiastical-history': _B([
    ['Introduction','_all',4],['Book I','_all',25],['Book II','_all',34],['Book III','_all',24],
    ['Book IV','_all',30],['Book V','_all',22],['Book VI','_all',40],['Book VII','_all',29],
    ['Book VIII','_all',28],['Book IX','_all',17]
  ]),
  'schaff-history-of-the-christian-church': _B([
    ['Vol. 1 \u00b7 Apostolic Christianity, AD 1\u2013100','schaff-history-vol-1.json'],
    ['Vol. 2 \u00b7 Ante-Nicene Christianity, AD 100\u2013325','schaff-history-vol-2.json'],
    ['Vol. 3 \u00b7 Nicene & Post-Nicene Christianity, AD 311\u2013600','schaff-history-vol-3.json']
  ]),
  'augustine-of-hippo': _B([
    ['1 Chronicles','_all',28],['1 Corinthians','_all',15],['1 John','_all',5],['1 Kings','_all',18],
    ['1 Peter','_all',5],['1 Samuel','_all',28],['1 Thessalonians','_all',5],['1 Timothy','_all',6],
    ['2 Chronicles','_all',30],['2 Corinthians','_all',12],['2 Kings','_all',22],['2 Peter','_all',3],
    ['2 Samuel','_all',23],['2 Thessalonians','_all',3],['2 Timothy','_all',4],['Acts','_all',23],
    ['Colossians','_all',4],['Daniel','_all',13],['Deuteronomy','_all',32],['Ecclesiastes','_all',12],
    ['Ephesians','_all',5],['Exodus','_all',36],['Ezekiel','_all',44],['Galatians','_all',6],
    ['Genesis','_all',32],['Habakkuk','_all',3],['Hebrews','_all',13],['Hosea','_all',13],
    ['Isaiah','_all',66],['James','_all',5],['Jeremiah','_all',36],['John','_all',21],['Jonah','_all',4],
    ['Joshua','_all',24],['Judges','_all',13],['Leviticus','_all',26],['Luke','_all',24],
    ['Malachi','_all',4],['Mark','_all',16],['Matthew','_all',28],['Micah','_all',7],['Numbers','_all',31],
    ['Philippians','_all',4],['Proverbs','_all',31],['Psalms','_all',150],['Revelation','_all',22],
    ['Romans','_all',16],['Sirach (Ecclesiasticus)','_all',51],['Song of Solomon','_all',8],
    ['Titus','_all',3],['Tobit','_all',13],['Wisdom','_all',16],['Zechariah','_all',13]
  ]),
  'bede': _B([
    ['1 John','_all',5],['1 Kings','_all',20],['1 Peter','_all',5],['1 Samuel','_all',31],
    ['2 John','_all',1],['2 Kings','_all',24],['2 Peter','_all',3],['3 John','_all',1],['Acts','_all',28],
    ['Ecclesiastes','_all',12],['Exodus','_all',39],['Ezra','_all',10],['Genesis','_all',28],
    ['Habakkuk','_all',3],['Hebrews','_all',12],['Isaiah','_all',61],['James','_all',5],
    ['Jeremiah','_all',31],['John','_all',21],['Jude','_all',1],['Leviticus','_all',26],['Luke','_all',24],
    ['Mark','_all',16],['Matthew','_all',28],['Nehemiah','_all',13],['Proverbs','_all',31],
    ['Psalms','_all',147],['Revelation','_all',22],['Romans','_all',12],['Song of Solomon','_all',8],
    ['Tobit','_all',14]
  ]),
  'origen-of-alexandria': _B([
    ['1 Chronicles','_all',28],['1 Corinthians','_all',15],['1 John','_all',5],['1 Kings','_all',22],
    ['1 Peter','_all',4],['1 Samuel','_all',28],['1 Thessalonians','_all',5],['1 Timothy','_all',6],
    ['2 Corinthians','_all',12],['2 Kings','_all',25],['2 Timothy','_all',4],['Acts','_all',27],
    ['Amos','_all',8],['Daniel','_all',13],['Deuteronomy','_all',32],['Ecclesiastes','_all',12],
    ['Ephesians','_all',6],['Exodus','_all',34],['Ezekiel','_all',44],['Galatians','_all',6],
    ['Genesis','_all',49],['Hebrews','_all',13],['Hosea','_all',14],['Isaiah','_all',66],
    ['James','_all',5],['Jeremiah','_all',50],['Job','_all',41],['John','_all',21],['Joshua','_all',24],
    ['Judges','_all',16],['Lamentations','_all',4],['Leviticus','_all',26],['Luke','_all',24],
    ['Malachi','_all',4],['Mark','_all',15],['Matthew','_all',27],['Numbers','_all',33],
    ['Philippians','_all',4],['Proverbs','_all',31],['Psalms','_all',150],['Revelation','_all',21],
    ['Romans','_all',16],['Sirach (Ecclesiasticus)','_all',50],['Song of Solomon','_all',6],
    ['Titus','_all',3],['Tobit','_all',11],['Wisdom','_all',18],['Zechariah','_all',13]
  ]),
  'cyril-of-alexandria': _B([
    ['1 Corinthians','_all',15],['1 John','_all',5],['1 Peter','_all',4],['2 Corinthians','_all',5],
    ['2 Peter','_all',3],['Acts','_all',15],['Amos','_all',9],['Exodus','_all',34],['Genesis','_all',49],
    ['Hebrews','_all',13],['Hosea','_all',14],['Isaiah','_all',66],['James','_all',5],
    ['Jeremiah','_all',51],['John','_all',21],['Jonah','_all',4],['Luke','_all',24],['Mark','_all',8],
    ['Matthew','_all',28],['Nahum','_all',3],['Obadiah','_all',1],['Philippians','_all',2],
    ['Proverbs','_all',27],['Psalms','_all',105],['Romans','_all',15],['Sirach (Ecclesiasticus)','_all',40],
    ['Song of Solomon','_all',8],['Wisdom','_all',9]
  ]),
  'theodoret-of-cyrus': _B([
    ['1 Corinthians','_all',16],['1 Peter','_all',2],['1 Timothy','_all',5],['2 Corinthians','_all',13],
    ['2 Timothy','_all',4],['Acts','_all',28],['Baruch','_all',2],['Daniel','_all',12],
    ['Ephesians','_all',6],['Ezekiel','_all',47],['Galatians','_all',6],['Hebrews','_all',13],
    ['Hosea','_all',11],['Isaiah','_all',66],['Jeremiah','_all',51],['John','_all',20],
    ['Philippians','_all',4],['Prayer of Azariah','_all',1],['Psalms','_all',146],['Romans','_all',16],
    ['Ruth','_all',4],['Song of Solomon','_all',8],['Titus','_all',2]
  ]),
  'oecumenius': _B([
    ['1 Corinthians','_all',15],['1 John','_all',5],['1 Peter','_all',5],['1 Timothy','_all',6],
    ['2 John','_all',1],['2 Peter','_all',3],['2 Timothy','_all',4],['3 John','_all',1],['Acts','_all',28],
    ['Hebrews','_all',13],['James','_all',5],['Jude','_all',1],['Philemon','_all',1],
    ['Revelation','_all',22],['Romans','_all',14],['Titus','_all',3]
  ]),
  'ambrosiaster': _B([
    ['1 Corinthians','_all',16],['1 Timothy','_all',5],['2 Corinthians','_all',13],
    ['2 Thessalonians','_all',3],['2 Timothy','_all',4],['Colossians','_all',4],['Ephesians','_all',6],
    ['Galatians','_all',6],['John','_all',16],['Philemon','_all',1],['Philippians','_all',4],
    ['Romans','_all',16]
  ]),
  'hilary-of-poitiers': _B([
    ['1 Corinthians','_all',15],['John','_all',20],['Mark','_all',14],['Matthew','_all',28],
    ['Philippians','_all',3],['Proverbs','_all',8],['Psalms','_all',139]
  ]),
  'andreas-of-caesarea': _B([
    ['1 John','_all',5],['1 Peter','_all',5],['2 Peter','_all',3],['Revelation','_all',22],
    ['James','_all',5],['Jude','_all',1]
  ]),
  'ryle-expository-thoughts-matthew': _B([
    ['Matthew 1','_all',2],['Matthew 2','_all',2],['Matthew 3','_all',2],['Matthew 4','_all',2],
    ['Matthew 5','_all',4],['Matthew 6','_all',4],['Matthew 7','_all',3],['Matthew 8','_all',3],
    ['Matthew 9','_all',3],['Matthew 10','_all',4],['Matthew 11','_all',3],['Matthew 12','_all',4],
    ['Matthew 13','_all',5],['Matthew 15','_all',4],['Matthew 16','_all',4],['Matthew 17','_all',3],
    ['Matthew 18','_all',3],['Matthew 19','_all',3],['Matthew 20','_all',4],['Matthew 21','_all',4],
    ['Matthew 22','_all',3],['Matthew 23','_all',3],['Matthew 24','_all',4],['Matthew 25','_all',3],
    ['Matthew 26','_all',7],['Matthew 27','_all',5],['Matthew 28','_all',2]
  ]),
  'luther-commentary-on-galatians': _B([
    ['Galatians','luther-commentary-on-galatians.json',6]
  ])
};

/* ---------- IndexedDB cache ---------- */
let db = null;
let dbReady;
function idbOpen(){
  if (dbReady) return dbReady;
  dbReady = new Promise((res,rej)=>{
    const req = indexedDB.open('bible-commentaries', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('cache');
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror = e => rej(e.target.error);
  });
  return dbReady;
}
function cacheGet(key){
  return new Promise(res=>{ try {
    const rq = db.transaction('cache','readonly').objectStore('cache').get(key);
    rq.onsuccess = ()=>res(rq.result);
    rq.onerror = ()=>res(undefined);
  } catch(e){ res(undefined); } });
}
function cacheSet(key,val){
  return new Promise(res=>{ try {
    const rq = db.transaction('cache','readwrite').objectStore('cache').put(val,key);
    rq.onsuccess = ()=>res(true);
    rq.onerror = ()=>res(false);
  } catch(e){ res(false); } });
}
async function persist(key,val){
  try { if (db) await cacheSet(key,val); } catch(e){ /* storage full - degrade gracefully */ }
}

/* ---------- Fetching ---------- */
async function fetchJSON(key,url){
  const hit = await cacheGet(key);
  if (hit && typeof hit === 'object') return hit;
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP '+r.status);
  const j = await r.json();
  await persist(key,j);
  return j;
}

const providerOf = cid => (COMMENTARIES.find(c=>c.id===cid)||{}).provider || 'ocd';

function bookURL(cid,bk){
  const c = COMMENTARIES.find(x=>x.id===cid)||{};
  const p = providerOf(cid);
  if (p==='haydock')  return HAYDOCK+'/'+bk.f;
  if (p==='catena')   return CATENA+'/'+bk.f;
  if (p==='ocdf')     return RAW+'/data/church-fathers/'+c.file;
  if (p==='history')  return RAW+'/data/structured-text/'+((bk.f && bk.f!=='_all') ? bk.f : (c.file||''));
  return RAW+'/data/commentaries/'+cid+'/'+bk.f;
}
const manifestURL = cid => RAW+'/data/commentaries/'+cid+'/_manifest.json';

function bookKey(cid,bk){
  const p = providerOf(cid);
  if (p==='ocd' || p==='haydock' || p==='catena') return 'b:'+cid+'/'+bk.f;
  return 'b:'+cid;                              /* whole-work files share one cache entry */
}

/* Fetch + parse a book, provider-aware. Catena files are JSONL. */
async function fetchBook(cid,bk){
  if (providerOf(cid) !== 'catena') return fetchJSON(bookKey(cid,bk), bookURL(cid,bk));
  const key = bookKey(cid,bk);
  const hit = await cacheGet(key);
  if (hit && typeof hit === 'object') return hit;
  const r = await fetch(bookURL(cid,bk));
  if (!r.ok) throw new Error('HTTP '+r.status);
  const txt = await r.text();
  const data = txt.split('\n').map(l=>l.trim()).filter(Boolean)
    .map(l=>{ try { return JSON.parse(l); } catch(e){ return null; } })
    .filter(Boolean);
  const j = { meta:{ title:'Catena Aurea', source:(data[0]&&data[0].source)||{} }, data };
  await persist(key,j);
  return j;
}

/* ---------- normalization helpers ---------- */
const wc = t => String(t||'').trim().split(/\s+/).filter(Boolean).length;

let _stripDiv = null;
function stripHtml(html){
  const s = String(html||'');
  if (typeof document !== 'undefined' && document.createElement){
    if (!_stripDiv) _stripDiv = document.createElement('div');
    _stripDiv.innerHTML = s;
    return (_stripDiv.textContent||'').replace(/\s+/g,' ').trim();
  }
  return s.replace(/<[^>]+>/g,' ').replace(/&[a-zA-Z]+;/g,' ').replace(/\s+/g,' ').trim();
}

/* "GEN.1.1" / "1SA.12.3" -> [chapter, verse] */
const HREF = /^[A-Za-z0-9]+\.(\d+)\.(\d+)/;
function hdRef(ref){
  const m = HREF.exec(String(ref||''));
  return m ? [parseInt(m[1],10), parseInt(m[2],10)] : [0,0];
}

/* OSIS refs may be single ("Gen.1.1") or ranged ("Num.36.6-Num.36.7").
   OCD church-father datasets use short tags ("Matt", "Ps", "1Cor") that
   canonical OSIS omits, so resolve both spellings to a display name. */
const OSIS_ALIAS = new Map([
  ['Gen','Genesis'],['Exod','Exodus'],['Lev','Leviticus'],['Num','Numbers'],['Deut','Deuteronomy'],
  ['Josh','Joshua'],['Judg','Judges'],['Ruth','Ruth'],['1Sam','1 Samuel'],['2Sam','2 Samuel'],
  ['1Kgs','1 Kings'],['2Kgs','2 Kings'],['1Chr','1 Chronicles'],['2Chr','2 Chronicles'],
  ['Ezra','Ezra'],['Neh','Nehemiah'],['Esth','Esther'],['Job','Job'],['Ps','Psalms'],['Psa','Psalms'],
  ['Prov','Proverbs'],['Eccl','Ecclesiastes'],['Song','Song of Solomon'],['Isa','Isaiah'],
  ['Jer','Jeremiah'],['Lam','Lamentations'],['Ezek','Ezekiel'],['Dan','Daniel'],['Hos','Hosea'],
  ['Joel','Joel'],['Amos','Amos'],['Obad','Obadiah'],['Jonah','Jonah'],['Mic','Micah'],
  ['Nah','Nahum'],['Hab','Habakkuk'],['Zeph','Zephaniah'],['Hag','Haggai'],['Zech','Zechariah'],
  ['Mal','Malachi'],
  ['1Macc','1 Maccabees'],['2Macc','2 Maccabees'],['Tob','Tobit'],['Jdt','Judith'],
  ['Wis','Wisdom'],['Sir','Sirach (Ecclesiasticus)'],['Bar','Baruch'],['PrAzar','Prayer of Azariah'],
  ['Sus','Susanna'],['Bel','Bel and the Dragon'],
  ['Matt','Matthew'],['Mat','Matthew'],['Mark','Mark'],['Luke','Luke'],['John','John'],['Acts','Acts'],
  ['Rom','Romans'],['1Cor','1 Corinthians'],['2Cor','2 Corinthians'],['Gal','Galatians'],
  ['Eph','Ephesians'],['Phil','Philippians'],['Col','Colossians'],['1Thess','1 Thessalonians'],
  ['2Thess','2 Thessalonians'],['1Tim','1 Timothy'],['2Tim','2 Timothy'],['Titus','Titus'],
  ['Phlm','Philemon'],['Philem','Philemon'],['Heb','Hebrews'],['Jas','James'],['1Pet','1 Peter'],
  ['2Pet','2 Peter'],['1John','1 John'],['2John','2 John'],['3John','3 John'],['Jude','Jude'],
  ['Rev','Revelation']
]);
function parseOsis(os){
  const a = String(os||'').split('-')[0];
  const m = /^\s*([A-Za-z0-9]+)\.(\d+)\.(\d+)/.exec(a);
  if (!m) return { name:null, ch:0, vr:null };
  const name = OSIS_NAME.get(m[1]) || OSIS_ALIAS.get(m[1]) || OSIS_ALIAS.get(m[1].toLowerCase()) || null;
  const ch = parseInt(m[2],10);
  const v1 = parseInt(m[3],10);
  let vr = String(v1);
  const b = String(os||'').split('-')[1];
  const mb = /^\s*[A-Za-z0-9]*\.?(\d+)\.(\d+)/.exec(b||'');
  if (mb && mb[1]===String(ch)) vr = v1+'-'+mb[2];
  return { name, ch, vr };
}

const ROMAN = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10, xi:11, xii:12, xiii:13, xiv:14, xv:15, xvi:16, xvii:17, xviii:18, xix:19, xx:20, xxi:21, xxii:22, xxiii:23, xxiv:24, xxv:25, xxvi:26, xxvii:27, xxviii:28, xxix:29, xxx:30, xxxi:31, xxxii:32, xxxiii:33, xxxiv:34, xxxv:35, xxxvi:36, xxxvii:37, xxxviii:38, xxxix:39, xl:40, xli:41, xlii:42, xliii:43, xliv:44, xlv:45, xlvi:46, xlvii:47, xlviii:48, xlix:49, l:50 };
function chapterNum(label){
  const s = String(label||'').toLowerCase().trim();
  let m = /\b(\d+)\b/.exec(s);
  if (m) return parseInt(m[1],10);
  m = /\b(m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})|m)\b/.exec(s);
  if (m) return ROMAN[m[1]] || null;
  return null;
}

/* ---------- per-provider normalizers -> flat entry list ---------- */
function normHaydock(bd){
  const out = [];
  (bd.entries||[]).forEach(e=>{
    const [ch1,v1] = hdRef(e.start), [ch2,v2] = hdRef(e.end);
    const ch = ch1||0;
    const vr = (ch1 && ch2 && ch1===ch2 && v2>v1) ? v1+'-'+v2 : (v1?String(v1):null);
    const text = stripHtml(e.body && e.body['en-US']);
    out.push({ chapter:ch, verse_range:vr, verse_text:'', commentary_text:text, word_count:wc(text), title:String(e.label||'').trim() });
  });
  return out;
}

function normCatena(bd, bookName){
  const out = [];
  const want = String(bookName||'').toLowerCase();
  (bd.data||[]).forEach(p=>{
    const parts = String(p.id||'').split('.');
    if (parts.length<4 || String(parts[1]||'').toLowerCase()!==want) return;
    const ch = parseInt(parts[2],10)||0;
    const v  = parseInt(parts[3],10)||0;
    let vr = v ? String(v) : null;
    const keys = p.commented_verse_keys||[];
    const nums = keys.map(k=>{ const n=parseInt(String(k).split('/').pop(),10); return n||0; }).filter(Boolean);
    if (nums.length>1){ const mn=Math.min(...nums), mx=Math.max(...nums); if (mx>mn) vr = mn+'-'+mx; else vr = String(mn||v||''); }
    const text = String(p.text || (p.segments||[]).map(s=>s.text).join('\n\n') || '').trim();
    const refs = (p.citations_out||[]).filter(c=>c.kind==='scripture').map(c=>c.raw).slice(0,12);
    out.push({ chapter:ch, verse_range:vr, verse_text:p.lemma||'', commentary_text:text, word_count:wc(text), title:String(p.title||'').trim(), cross_references:refs });
  });
  return out;
}

function normOcdf(bd, bookName){
  const out = [];
  (bd.data||[]).forEach(e=>{
    const osis = (e.anchor_ref && e.anchor_ref.osis) || [];
    if (!osis.length) return;
    const r = parseOsis(osis[0]);
    if (!r.name || r.name !== bookName || !r.ch) return;
    const text = String(e.quote||'').trim();
    out.push({ chapter:r.ch, verse_range:r.vr, verse_text:'', commentary_text:text, word_count:e.word_count || wc(text), title:String(e.source_title||'').trim(), cross_references:[] });
  });
  return out;
}

/* History works: OCD structured-text files. Each top-level section is a "book"
   whose children are chapters ("book" sections, e.g. Eusebius Book III), or the
   file is already a flat list of chapter sections (e.g. a Schaff volume). */
function collectBlocks(sec, acc){
  const a = acc || [];
  (sec.content_blocks||[]).forEach(b=>a.push(b));
  (sec.children||[]).forEach(c=>collectBlocks(c,a));
  return a;
}
function collectRefs(sec, acc){
  const a = acc || [];
  (sec.scripture_references||[]).forEach(r=>{
    (r.osis||[]).forEach(o=>{ if (typeof o==='string' && o.trim()) a.push(o.trim()); });
  });
  (sec.children||[]).forEach(c=>collectRefs(c,a));
  return a;
}

function normHistory(bd, bookName, sectionIndex){
  const raw = bd.data;
  const root = Array.isArray(raw) ? (raw[0]||{}) : (raw||{});
  const secs = root.sections || [];
  const flat = secs.some(s=>s.section_type==='chapter');
  let chapters;
  if (flat){
    chapters = secs.filter(s=>s.section_type==='chapter');
  } else {
    const sec = secs[sectionIndex] || secs.find(s=>String(s.label||'').toLowerCase()===String(bookName||'').toLowerCase()) || secs[0];
    chapters = (sec ? sec.children : []).filter(c=>c.section_type==='chapter');
  }
  const out = [];
  chapters.forEach((sec,i)=>{
    const text = collectBlocks(sec).map(b=>b.trim()).filter(Boolean).join('\n\n');
    if (!text) return;
    const ch = i+1;             /* keep file order; some sources mis-sort labels */
    if (flat && sec.children && sec.children.length){
      /* each sub-section (§) becomes an entry within the chapter */
      sec.children.forEach((sub,j)=>{
        const st = collectBlocks(sub).map(b=>b.trim()).filter(Boolean).join('\n\n');
        if (!st) return;
        out.push({ chapter:ch, verse_range:null, verse_text:'', commentary_text:st, word_count:wc(st), title:String(sub.label||sub.title||'Section '+(j+1)).trim(), cross_references:Array.from(new Set(collectRefs(sub))).slice(0,16) });
      });
    } else {
      out.push({ chapter:ch, verse_range:null, verse_text:'', commentary_text:text, word_count:wc(text), title:String(sec.title||sec.label||'').trim(), cross_references:Array.from(new Set(collectRefs(sec))).slice(0,16) });
    }
  });
  return out;
}

/* ---------- bucketing ---------- */
function normalizeBook(bd, declared, ctx){
  ctx = ctx || {};
  const p = ctx.provider || 'ocd';
  let entries;
  if      (p==='haydock') entries = normHaydock(bd);
  else if (p==='catena')  entries = normCatena(bd, ctx.bookName);
  else if (p==='ocdf')    entries = normOcdf(bd, ctx.bookName);
  else if (p==='history') entries = normHistory(bd, ctx.bookName, ctx.sectionIndex);
  else entries = (bd.data||[]).map(e=>({ chapter:e.chapter||0, verse_range:e.verse_range, verse_text:e.verse_text, commentary_text:e.commentary_text, word_count:e.word_count, cross_references:e.cross_references||[], title:e.title||'' }));

  const byChapter = {};
  entries.forEach(e=>{ (byChapter[e.chapter] = byChapter[e.chapter]||[]).push(e); });
  const maxSeen = Math.max(0, ...Object.keys(byChapter).map(Number));
  const count = Math.max(declared||0, maxSeen);
  const chapters = [];
  for (let i=1;i<=count;i++){
    chapters.push({
      ch:i,
      entries: byChapter[i]||[],
      intro: (byChapter[0]||[]).filter(e=>!e.verse_range || e.verse_range==='intro')
    });
  }
  return { meta: bd.meta||{}, chapters };
}