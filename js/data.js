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
  { id:'augustine-of-hippo', title:'Expositions, Homilies & Exposition of the Psalms', author:'Augustine of Hippo', year:410, era:'Doctor of grace', desc:'The bishop of Hippo, the most influential theologian of the West \u2014 his expositions of the Psalms and tractates on John run from here well into the next life, deep and full of love.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'augustine-of-hippo.json' },
  { id:'bede', title:'Commentaries on Luke, Mark, Acts & the Catholic Epistles', author:'Bede the Venerable', year:724, era:'Father of English history', desc:'The Venerable Bede, the first English scholar \u2014 a patient, faithful commentator who gathered the whole tradition of the Fathers into clear notes on the apostolic books.', tradition:['Church Elders','Anglican'], provider:'ocdf', file:'bede.json' },
  { id:'origen-of-alexandria', title:'Commentaries & Fragments on Scripture', author:'Origen of Alexandria', year:230, era:'Master of allegory', desc:'The great Alexandrian \u2014 the most learned and prolific exegete of the early church \u2014 his commentaries and homilies preserved across nearly the whole Bible.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'origen-of-alexandria.json' },
  { id:'cyril-of-alexandria', title:'Commentaries on the Gospels and Prophets', author:'Cyril of Alexandria', year:430, era:'Doctor of the Incarnation', desc:'The patriarch of Alexandria, champion of the Nicene faith \u2014 his great commentaries on the Gospel of John and Luke defend the divinity of Christ on every page.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'cyril-of-alexandria.json' },
  { id:'theodoret-of-cyrus', title:'Commentaries on the Prophets, Psalms & Epistles', author:'Theodoret of Cyrus', year:450, era:'Antiochian exegete', desc:'The learned bishop of Cyrrhus, last great Antiochene interpreter \u2014 sober, historical exposition of the prophets, the Psalms and the Pauline epistles.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'theodoret-of-cyrus.json' },
  { id:'oecumenius', title:'Commentary on Acts, Hebrews & Revelation', author:'Oecumenius of Tricca', year:990, era:'Byzantine commentator', desc:'The earliest surviving Byzantine commentator on Revelation \u2014 mystical and apostolic notes on Acts, Hebrews, the Catholic epistles and the Apocalypse.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'oecumenius.json' },
  { id:'ambrosiaster', title:'Commentary on the Pauline Epistles', author:'Ambrosiaster (Pseudo-Ambrose)', year:380, era:'Early Latin exegete', desc:'The anonymous \u201cAmbrose\u2019-star\u201d of the fourth-century West \u2014 the oldest complete Latin commentary on the Pauline epistles, so penetrating that even Erasmus admired him.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'ambrosiaster.json' },
  { id:'hilary-of-poitiers', title:'Commentary on the Gospel of Matthew', author:'Hilary of Poitiers', year:360, era:'Athanasius of the West', desc:'Hilary\u2019s commentary on Matthew \u2014 the first Latin verse-by-verse Gospel commentary that survives, written by the great defender of Nicaea in Gaul.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'hilary-of-poitiers.json' },
  { id:'andreas-of-caesarea', title:'Commentary on the Apocalypse', author:'Andrew of Caesarea', year:610, era:'Byzantine apocalyptic exegesis', desc:'The classic Eastern commentary on Revelation \u2014 sober, orderly and much-loved in the Greek church, drawing on Methodius, Irenaeus and Origen.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'andreas-of-caesarea.json' },
  { id:'jerome', title:'Commentaries on the Prophets, the Gospel of Matthew & the Psalms', author:'Jerome', year:410, era:'The great Latin scholar', desc:'The bluest of the Latin scholars, translator of the Vulgate \u2014 his magnificent commentaries on Isaiah, Jeremiah, Ezekiel, the Gospel of Matthew and the Psalms, bristling with Hebrew learning.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'jerome.json' },
  { id:'ephrem-the-syrian', title:'Commentaries & Hymns on the Scriptures', author:'Ephrem the Syrian', year:373, era:'The harp of the Holy Spirit', desc:'Ephrem of Nisibis \u2014 the most beloved poet-theologian of the Syrian church, whose Genesis commentary, Gospel harmonies and poetic exegesis sing the Scriptures back to the soul.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'ephrem-the-syrian.json' },
  { id:'cassiodorus', title:'Commentary on the Psalms & Exposition of Scripture', author:'Cassiodorus', year:575, era:'Senator turned monk', desc:'The Roman senator who founded Vivarium, whose vast Psalms commentary became the staple of Latin exegesis \u2014 a gentle, learned introduction to the whole Bible for his monks and for us.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'cassiodorus.json' },
  { id:'theodore-of-mopsuestia', title:'Commentaries on the Gospel of John & the Psalms', author:'Theodore of Mopsuestia', year:428, era:'The great Antiochene', desc:'The most celebrated biblical critic of the early church \u2014 sober, historical Antiochene exposition of John, the Psalms, and the Pauline epistles.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'theodore-of-mopsuestia.json' },
  { id:'didymus-the-blind', title:'Commentaries on Ecclesiastes, Job & the Psalms', author:'Didymus the Blind', year:395, era:'Alexandrian teacher', desc:'The great blind teacher of Alexandria who taught Jerome and Rufinus \u2014 surviving fragments of his commentaries on Ecclesiastes, Job, Genesis and the Psalms.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'didymus-the-blind.json' },
  { id:'pseudo-chrysostom', title:'Opus Imperfectum in Matthaeum & Gospel Commentaries', author:'Pseudo-Chrysostom', year:500, era:'Early Latin homilist', desc:'The anonymous \u201cIncomplete Work on Matthew\u201d long attributed to Chrysostom \u2014 one of the most widely copied Gospel commentaries of the Middle Ages.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'pseudo-chrysostom.json' },
  { id:'victorinus-of-pettau', title:'Commentary on the Apocalypse', author:'Victorinus of Pettau', year:303, era:'First Latin expositor', desc:'The earliest surviving Christian commentary on the whole Bible\u2019s last book \u2014 written by the martyr-bishop of Pettau, sober and millenarian.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'victorinus-of-pettau.json' },
  { id:'primasius-of-hadrumetum', title:'Commentary on the Apocalypse', author:'Primasius of Hadrumetum', year:560, era:'African expositor', desc:'The African bishop\u2019s great Revelation commentary \u2014 an ordered synthesis of Tyconius and Augustine, the fullest African account of the Apocalypse.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'primasius-of-hadrumetum.json' },
  { id:'apringius-of-beja', title:'Commentary on the Apocalypse', author:'Apringius of Beja', year:540, era:'Visigothic expositor', desc:'The seventh-century bishop of Beja whose Revelation commentary survives \u2014 a vigorous, plain spiritual reading of the last book.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'apringius-of-beja.json' },
  { id:'diodorus-of-tarsus', title:'Commentaries on the Psalms & the Epistle to the Romans', author:'Diodore of Tarsus', year:390, era:'Founder of the Antiochene school', desc:'The teacher of Theodore and Theodoret \u2014 surviving fragments of his literal, historical exegesis of the Psalms and Romans, the fountainhead of the Antiochene school.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'diodorus-of-tarsus.json' },
  { id:'severian-of-gabala', title:'Homilies & Commentaries on the Pauline Epistles', author:'Severian of Gabala', year:408, era:'Byzantine preacher', desc:'The eloquent bishop of Gabala, Chrysostom\u2019s rival in Constantinople \u2014 surviving homilies and commentaries on the epistles of Paul.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'severian-of-gabala.json' },
  { id:'augustine-tractates-on-john', title:'Tractates on the Gospel of John', author:'Augustine of Hippo', year:417, era:'Verse-by-verse on the fourth Gospel', desc:'Augustine\u2019s 124 Tractates in Johannem \u2014 the fullest early commentary on the fourth Gospel, preached at Hippo through the years of grace and schism, beloved for the deep soul-work on every page.', tradition:['Church Elders','Catholic'], provider:'aug', file:'augustine-tractates-on-john.json' },
  { id:'augustine-expositions-on-psalms', title:'Expositions on the Book of Psalms', author:'Augustine of Hippo', year:415, era:'The longest commentary on the Psalter', desc:'Augustine\u2019s incomparable expositions of all one hundred and fifty psalms \u2014 nearly half of his entire literary corpus, and the most influential commentary on the Psalter the West has ever known.', tradition:['Church Elders','Catholic'], provider:'aug', file:'augustine-expositions-on-psalms.json' },
  { id:'gregory-the-dialogist', title:'Commentaries on Job & the Gospels', author:'Gregory the Great', year:595, era:'Pope Gregory and the Moralia', desc:'Gregory the Great\u2019s Moralia in Job \u2014 the most copied commentary of the medieval West, a vast pastoral and mystical reading of Job, set beside his Gospel homilies and notes on 1 Samuel.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'gregory-the-dialogist.json' },
  { id:'glossa-ordinaria', title:'The Ordinary Gloss on the Gospels', author:'Anselm of Laon and the Glossators', year:1150, era:'The medieval standard commentary', desc:'The Glossa Ordinaria \u2014 for centuries the church\u2019s standard tool, an interlinear margin of the choicest Fathers\u2019 sayings on the Gospel text, gathered at Laon and used throughout medieval Christendom.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'glossa-ordinaria.json' },
  { id:'ambrose-of-milan', title:'Commentaries on Luke, the Psalms & Genesis', author:'Ambrose of Milan', year:390, era:'The eloquent bishop', desc:'The great Milanese bishop whose preaching won Augustine for Christ \u2014 his verse-by-verse commentary on the Gospel of Luke, the Explanations of Twelve Psalms and the hexaemeral homilies on Genesis.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'ambrose-of-milan.json' },
  { id:'gregory-of-nyssa', title:'Commentaries on the Song of Songs & Ecclesiastes', author:'Gregory of Nyssa', year:390, era:'The mystic of Cappadocia', desc:'Gregory of Nyssa, the most profound theologian of the three Cappadocians \u2014 his fresh, contemplative commentaries on the Song of Songs and Ecclesiastes, and his homilies on the Beatitudes.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'gregory-of-nyssa.json' },
  { id:'alcuin-of-york', title:'Expositions on the Apocalypse & Inquiries on John', author:'Alcuin of York', year:800, era:'The Carolingian schoolmaster', desc:'The most learned man of Charlemagne\u2019s court \u2014 his methodical Exposition on the Apocalypse and Questions on the Gospel of John, answering the schools from the Fathers.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'alcuin-of-york.json' },
  { id:'aponius', title:'Explanation of the Song of Songs', author:'Aponius (Apponius)', year:420, era:'Early Latin exegete', desc:'An obscure fifth-century Italian monk whose vivid mystical Explanation of the Song of Songs survives \u2014 embroidering Origen and Ambrose into a whole volume on the Bridegroom and the Bride.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'aponius.json' },
  { id:'chromatius-of-aquileia', title:'Commentary on the Gospel of Matthew', author:'Chromatius of Aquileia', year:405, era:'Late Latin expositor', desc:'The bishop of Aquileia, friend of Jerome and Rufinus \u2014 his Commentary on Matthew, warm, pastoral, and only rediscovered in modern times, is one of the rare treasures of the old Latin church.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'chromatius-of-aquileia.json' },
  { id:'gregory-of-elvira', title:'Tractates on the Song of Songs & the Scriptures', author:'Gregory of Elvira', year:400, era:'Spanish bishop', desc:'The Spanish bishop whose feast-day Tractates on the Song of Songs and other scriptures survive \u2014 Christ-mystical readings in the school of Cyprian and the Alexandria of the West.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'gregory-of-elvira.json' },
  { id:'haimo-of-auxerre', title:'Commentaries on Jonah & 2 Thessalonians', author:'Haimo of Auxerre', year:855, era:'Carolingian commentator', desc:'The Benedictine master of Auxerre whose commentaries carried the Fathers into the ninth century \u2014 on the poetry of Jonah and the day of the Lord in Paul.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'haimo-of-auxerre.json' },
  { id:'hippolytus-of-rome', title:'Commentaries on Daniel, the Song of Songs & the Scriptures', author:'Hippolytus of Rome', year:235, era:'Third-century Roman teacher', desc:'The Roman presbyter and martyr \u2014 the earliest surviving Christian commentary on Daniel, the homilies on the Song of Songs, and exegetical fragments on the Gospels, bold and chiliastic.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'hippolytus-of-rome.json' },
  { id:'hilary-of-arles', title:'Commentary on the Catholic Epistles', author:'Hilary of Arles', year:449, era:'Gallic bishop', desc:'The metropolitan of Arles whose plain, copious Commentary on the Catholic Epistles survives intact \u2014 practical, patristic and thorough.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'hilary-of-arles.json' },
  { id:'ishodad-of-merv', title:'Commentaries on the Old Testament', author:'Isho\u2019dad of Merv', year:850, era:'Syriac exegete', desc:'The ninth-century Syriac bishop whose vast commentaries on the Old and New Testaments preserve the school of Edessa \u2014 on Job, Kings, Isaiah and Daniel.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'ishodad-of-merv.json' },
  { id:'julian-of-eclanum', title:'Commentary on the Book of Job', author:'Julian of Eclanum', year:425, era:'Late Latin exegete', desc:'The gifted Italian bishop\u2019s literal Commentary on Job \u2014 learned fragments of the most skillful Latin exegete of his age, later swept away with Pelagius.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'julian-of-eclanum.json' },
  { id:'nicholas-of-lyra', title:'Postilla on the Apocalypse & Thessalonians', author:'Nicholas of Lyra', year:1325, era:'The last of the glossators', desc:'The medieval postillator whose Postilla became the standard tool of the later schools \u2014 on the Apocalypse and the letters to the Thessalonians, literal and Hebrew-literate.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'nicholas-of-lyra.json' },
  { id:'olympiodorus-of-alexandria', title:'Commentaries on Job, Ecclesiastes & Baruch', author:'Olympiodorus of Alexandria', year:550, era:'Alexandrian deacon', desc:'The Alexandrian deacon whose commentaries on Job and Ecclesiastes survive \u2014 plain and pious, the last voice of the Alexandrian school.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'olympiodorus-of-alexandria.json' },
  { id:'paterius', title:'Excerpts on the Pentateuch', author:'Paterius', year:600, era:'Gregory\u2019s secretary', desc:'The disciple of Pope Gregory the Great who wove his master\u2019s Moralia and expositions into a running commentary anthology on the books of Moses.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'paterius.json' },
  { id:'philo-of-alexandria', title:'Allegorical Commentary on Genesis', author:'Philo of Alexandria', year:40, era:'Alexandrian Jewish expositor', desc:'The first great biblical commentator \u2014 Philo\u2019s allegorical readings of Genesis that shaped Clement, Origen and the whole Christian school of exegesis.', tradition:['Church Elders','Patristic'], provider:'ocdf', file:'philo-of-alexandria.json' },
  { id:'procopius-of-gaza', title:'Catena on Isaiah & Numbers', author:'Procopius of Gaza', year:528, era:'The catenist of Gaza', desc:'The rhetor of Gaza, father of the catena method \u2014 his chain of patristic readings on Isaiah and Numbers, one century before the Dark Ages closed.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'procopius-of-gaza.json' },
  { id:'rabanus-maurus', title:'Commentaries on Matthew, Esther, Sirach & Wisdom', author:'Rabanus Maurus', year:830, era:'The teacher of Germany', desc:'The great Carolingian abbot of Fulda who distilled the Fathers into methodical commentaries \u2014 on Matthew, Esther, Sirach and Wisdom.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'rabanus-maurus.json' },
  { id:'remigius-of-auxerre', title:'Commentary on the Gospel of Matthew', author:'Remigius of Auxerre', year:908, era:'Carolingian commentator', desc:'The monk of Auxerre whose vast Commentary on Matthew carried patristic exegesis into the tenth century and the nascent schools.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'remigius-of-auxerre.json' },
  { id:'robert-of-tombelaine', title:'Commentary on the Song of Songs', author:'Robert of Tombelaine', year:1087, era:'Benedictine contemplative', desc:'The Norman hermit of Mont-Saint-Michel whose long Commentary on the Song of Songs paints every verse in human affection and divine love \u2014 long believed to be Gregory\u2019s.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'robert-of-tombelaine.json' },
  { id:'ticonius', title:'Commentary on the Apocalypse & the Book of Rules', author:'Tyconius', year:390, era:'The African exegete', desc:'The Donatist lay theologian whose commentary and seven Rules of figurative interpretation shaped Augustine and all later Revelation study.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'ticonius.json' },
  { id:'titus-of-bostra', title:'Commentary on the Gospel of Luke', author:'Titus of Bostra', year:370, era:'Antiochene expositor', desc:'The metropolitan of Bostra whose lucid Commentary on the Gospel of Luke survives along with his apology against the Manichees.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'titus-of-bostra.json' },
  { id:'pseudo-jerome', title:'Commentary on the Gospel of Mark', author:'Pseudo-Jerome', year:550, era:'Spiritual reading of Mark', desc:'The early-medieval Commentary on Mark long carried under Jerome\u2019s name \u2014 lively, spiritual, and one of the very few ancient expositions of the second Gospel.', tradition:['Church Elders','Catholic'], provider:'ocdf', file:'pseudo-jerome.json' },
  { id:'hesychius-of-jerusalem', title:'Commentaries on Job, the Psalms & the Catholic Epistles', author:'Hesychius of Jerusalem', year:450, era:'Palestinian presbyter', desc:'The Jerusalem presbyter whose exegetical notes on Job, the Psalms, Wisdom and James survive \u2014 learned, moral, entire.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'hesychius-of-jerusalem.json' },
  { id:'photios-i-of-constantinople', title:'Commentary on the Epistle to the Hebrews', author:'Photius of Constantinople', year:880, era:'The great patriarch-scholar', desc:'The ecumenical patriarch of Constantinople, author of the Bibliotheca \u2014 his commentary fragments on the Epistle to the Hebrews.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'photios-i-of-constantinople.json' },
  { id:'john-damascene', title:'Commentary on the Pauline Epistles', author:'John of Damascus', year:745, era:'The last of the Fathers', desc:'The last of the Greek Fathers \u2014 his catena-commentary on Paul and scripture-rich dogmatics, the summa of Eastern patristics.', tradition:['Church Elders','Orthodox'], provider:'ocdf', file:'john-damascene.json' },
  { id:'chrysostom-homilies-on-matthew', title:'The Homilies on the Gospel of Matthew', author:'John Chrysostom', year:390, era:'The golden-mouthed at Antioch', desc:'The full ninety homilies on Matthew preached at Antioch \u2014 verse by verse, the most famous commentary on the first Gospel in the Eastern church.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-matthew.json' },
  { id:'chrysostom-homilies-on-john', title:'The Homilies on the Gospel of John', author:'John Chrysostom', year:401, era:'The golden-mouthed at Constantinople', desc:'The eighty-eight homilies on the fourth Gospel \u2014 luminous verse-by-verse preaching on the divinity of Christ, the crown of the Antiochene school.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-john.json' },
  { id:'chrysostom-homilies-on-acts', title:'The Homilies on the Acts of the Apostles', author:'John Chrysostom', year:400, era:'The golden-mouthed at Constantinople', desc:'The fifty-five homilies on Acts \u2014 the first great commentary on the earliest history of the church, preached at Constantinople.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-acts.json' },
  { id:'chrysostom-homilies-on-romans', title:'The Homilies on the Epistle to the Romans', author:'John Chrysostom', year:391, era:'The golden-mouthed at Antioch', desc:'The thirty-two homilies on Romans \u2014 Paul greeted in the Antiochene market places of the soul, with the famous preface listing his nine excellences.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-romans.json' },
  { id:'chrysostom-homilies-on-1-corinthians', title:'The Homilies on the First Epistle to the Corinthians', author:'John Chrysostom', year:392, era:'The golden-mouthed at Antioch', desc:'The forty-four homilies on 1 Corinthians \u2014 the noblest commentary on Paul\u2019s great epistle of love and order, preached troop by troop at Antioch.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-1-corinthians.json' },
  { id:'chrysostom-homilies-on-2-corinthians', title:'The Homilies on the Second Epistle to the Corinthians', author:'John Chrysostom', year:393, era:'The golden-mouthed at Antioch', desc:'The thirty homilies on 2 Corinthians \u2014 the apostle\u2019s wounds and glory unfolded for the suffering church of the fourth century.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-2-corinthians.json' },
  { id:'chrysostom-commentary-on-galatians', title:'Commentary on the Epistle to the Galatians', author:'John Chrysostom', year:395, era:'Argument and grace', desc:'Chrysostom\u2019s continuous commentary on Galatians \u2014 Paul\u2019s trumpet against the Judaizers, defended by the golden tongue.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-commentary-on-galatians.json' },
  { id:'chrysostom-homilies-on-ephesians', title:'The Homilies on the Epistle to the Ephesians', author:'John Chrysostom', year:399, era:'The golden-mouthed at Constantinople', desc:'The twenty-four homilies on Ephesians \u2014 the church as the body of Christ, mystically adorned and daily built.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-ephesians.json' },
  { id:'chrysostom-homilies-on-philippians', title:'The Homilies on the Epistle to the Philippians', author:'John Chrysostom', year:399, era:'The golden-mouthed at Constantinople', desc:'The fifteen homilies on Philippians \u2014 joy in every circumstance, preached to a church in bonds.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-philippians.json' },
  { id:'chrysostom-homilies-on-colossians', title:'The Homilies on the Epistle to the Colossians', author:'John Chrysostom', year:398, era:'The golden-mouthed at Constantinople', desc:'The twelve homilies on Colossians \u2014 Christ the head of all, against the angel-worshippers and the false wisdom.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-colossians.json' },
  { id:'chrysostom-homilies-on-1-thessalonians', title:'The Homilies on the First Epistle to the Thessalonians', author:'John Chrysostom', year:399, era:'The golden-mouthed at Constantinople', desc:'The eleven homilies on 1 Thessalonians \u2014 on the beginning of the church at Thessalonica and the blessed hope of resurrection.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-1-thessalonians.json' },
  { id:'chrysostom-homilies-on-2-thessalonians', title:'The Homilies on the Second Epistle to the Thessalonians', author:'John Chrysostom', year:399, era:'The golden-mouthed at Constantinople', desc:'The five homilies on 2 Thessalonians \u2014 false alarms about the day of the Lord answered with patience and work.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-2-thessalonians.json' },
  { id:'chrysostom-homilies-on-1-timothy', title:'The Homilies on the First Epistle to Timothy', author:'John Chrysostom', year:403, era:'The golden-mouthed at Constantinople', desc:'The eighteen homilies on 1 Timothy \u2014 the pastoral office opened, from the charge to the crowning of the pastor\u2019s flock.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-1-timothy.json' },
  { id:'chrysostom-homilies-on-2-timothy', title:'The Homilies on the Second Epistle to Timothy', author:'John Chrysostom', year:405, era:'The golden-mouthed at Constantinople', desc:'The ten homilies on 2 Timothy \u2014 Paul\u2019s farewell armory to the young bishop, preached as the horizon darkened.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-2-timothy.json' },
  { id:'chrysostom-homilies-on-titus', title:'The Homilies on the Epistle to Titus', author:'John Chrysostom', year:405, era:'The golden-mouthed at Constantinople', desc:'The six homilies on Titus \u2014 the little bishop\u2019s epistle of good works, well ordered by the golden expositor.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-titus.json' },
  { id:'chrysostom-homilies-on-philemon', title:'The Homilies on the Epistle to Philemon', author:'John Chrysostom', year:403, era:'The golden-mouthed at Constantinople', desc:'The three homilies on Philemon \u2014 one runaway slave, one master, one apostle, and the whole Epistle in a single moral scene.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-philemon.json' },
  { id:'chrysostom-homilies-on-hebrews', title:'The Homilies on the Epistle to the Hebrews', author:'John Chrysostom', year:404, era:'The golden-mouthed at Constantinople', desc:'The thirty-four homilies on Hebrews \u2014 the priesthood of Christ unfolded with the full daylight of the golden preacher.', tradition:['Church Elders','Orthodox'], provider:'aug', file:'chrysostom-homilies-on-hebrews.json' },
  { id:'augustine-homilies-on-first-john', title:'The Homilies on the First Epistle of John', author:'Augustine of Hippo', year:407, era:'Preached at Hippo', desc:'Augustine\u2019s ten homilies on 1 John \u2014 love teaching love, preached at Hippo over the days of Easter Week in 407, perhaps his most beloved short course.', tradition:['Church Elders','Catholic'], provider:'aug', file:'augustine-homilies-on-first-john.json' },

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
  ]),
  'jerome': _B([
    ['1 Chronicles','_all',28],['1 Corinthians','_all',15],['1 Kings','_all',21],['1 Samuel','_all',24],
    ['1 Thessalonians','_all',5],['1 Timothy','_all',6],['2 Chronicles','_all',35],['2 Corinthians','_all',11],
    ['2 Samuel','_all',24],['2 Timothy','_all',4],['Acts','_all',27],['Amos','_all',9],['Colossians','_all',3],
    ['Daniel','_all',14],['Deuteronomy','_all',32],['Ecclesiastes','_all',12],['Ephesians','_all',6],
    ['Esther','_all',8],['Exodus','_all',34],['Ezekiel','_all',48],['Ezra','_all',10],['Galatians','_all',6],
    ['Genesis','_all',49],['Habakkuk','_all',3],['Haggai','_all',2],['Hebrews','_all',12],['Hosea','_all',14],
    ['Isaiah','_all',66],['Jeremiah','_all',52],['Joel','_all',3],['John','_all',21],['Jonah','_all',4],
    ['Joshua','_all',24],['Judges','_all',20],['Lamentations','_all',4],['Leviticus','_all',22],
    ['Luke','_all',23],['Malachi','_all',4],['Mark','_all',16],['Matthew','_all',28],['Micah','_all',7],
    ['Nahum','_all',3],['Numbers','_all',33],['Obadiah','_all',1],['Philemon','_all',1],
    ['Prayer of Azariah','_all',1],['Proverbs','_all',31],['Psalms','_all',148],['Revelation','_all',22],
    ['Romans','_all',16],['Song of Solomon','_all',8],['Titus','_all',3],['Zechariah','_all',14],
    ['Zephaniah','_all',3]
  ]),
  'ephrem-the-syrian': _B([
    ['1 Kings','_all',22],['2 Kings','_all',22],['Acts','_all',22],['Daniel','_all',12],['Exodus','_all',34],
    ['Genesis','_all',50],['Hebrews','_all',13],['Isaiah','_all',66],['Jeremiah','_all',49],['Job','_all',42],
    ['John','_all',21],['Luke','_all',24],['Mark','_all',15],['Micah','_all',4],['Obadiah','_all',1],
    ['Proverbs','_all',30],['Psalms','_all',139],['Zechariah','_all',14]
  ]),
  'cassiodorus': _B([
    ['1 Corinthians','_all',15],['1 Samuel','_all',27],['Acts','_all',28],['Exodus','_all',32],
    ['Ezekiel','_all',37],['Hebrews','_all',12],['Isaiah','_all',57],['Proverbs','_all',24],
    ['Psalms','_all',149],['Song of Solomon','_all',6],['Wisdom','_all',11]
  ]),
  'theodore-of-mopsuestia': _B([
    ['1 Corinthians','_all',15],['1 Timothy','_all',5],['2 Corinthians','_all',12],['2 Timothy','_all',4],
    ['Hebrews','_all',13],['Hosea','_all',14],['John','_all',21],['Matthew','_all',18],['Philemon','_all',1],
    ['Psalms','_all',72],['Romans','_all',15],['Titus','_all',2]
  ]),
  'didymus-the-blind': _B([
    ['1 Corinthians','_all',16],['1 John','_all',5],['1 Peter','_all',4],['2 Corinthians','_all',13],
    ['Acts','_all',21],['Ecclesiastes','_all',12],['Genesis','_all',16],['James','_all',4],['Job','_all',14],
    ['John','_all',17],['Proverbs','_all',30],['Psalms','_all',40],['Wisdom','_all',13]
  ]),
  'pseudo-chrysostom': _B([
    ['Luke','_all',19],['Mark','_all',11],['Matthew','_all',28]
  ]),
  'victorinus-of-pettau': _B([
    ['1 Corinthians','_all',15],['John','_all',12],['Revelation','_all',22]
  ]),
  'primasius-of-hadrumetum': _B([
    ['Isaiah','_all',35],['Revelation','_all',22]
  ]),
  'apringius-of-beja': _B([
    ['Revelation','_all',22]
  ]),
  'diodorus-of-tarsus': _B([
    ['Psalms','_all',50],['Romans','_all',15]
  ]),
  'severian-of-gabala': _B([
    ['1 Corinthians','_all',15],['2 Corinthians','_all',13],['Colossians','_all',3],['Genesis','_all',19],
    ['Hebrews','_all',12],['Prayer of Azariah','_all',1],['Romans','_all',10]
  ]),
  'augustine-tractates-on-john': _B([
    ['John','_all',21]
  ]),
  'augustine-expositions-on-psalms': _B([
    ['Psalms','_all',150]
  ]),
  'gregory-the-dialogist': _B([
    ['1 Corinthians','_all',15],['1 John','_all',4],['1 Peter','_all',4],['1 Samuel','_all',30],
    ['1 Timothy','_all',5],['2 Corinthians','_all',12],['2 Samuel','_all',24],['Acts','_all',11],
    ['Amos','_all',7],['Ecclesiastes','_all',12],['Ephesians','_all',5],['Exodus','_all',38],
    ['Ezekiel','_all',44],['Hebrews','_all',13],['Hosea','_all',13],['Isaiah','_all',66],
    ['James','_all',5],['Jeremiah','_all',48],['Job','_all',42],['Joel','_all',2],['John','_all',21],
    ['Judges','_all',16],['Lamentations','_all',4],['Leviticus','_all',27],['Luke','_all',24],
    ['Mark','_all',16],['Matthew','_all',28],['Proverbs','_all',29],['Psalms','_all',149],
    ['Revelation','_all',22],['Romans','_all',12],['Sirach (Ecclesiasticus)','_all',34],
    ['Song of Solomon','_all',8]
  ]),
  'glossa-ordinaria': _B([
    ['John','_all',21],['Lamentations','_all',1],['Luke','_all',24],['Mark','_all',16],['Matthew','_all',28]
  ]),
  'ambrose-of-milan': _B([
    ['1 Corinthians','_all',15],['1 Kings','_all',21],['1 Peter','_all',4],['1 Samuel','_all',25],
    ['1 Thessalonians','_all',5],['1 Timothy','_all',6],['2 Corinthians','_all',13],['2 Kings','_all',24],
    ['2 Samuel','_all',24],['2 Thessalonians','_all',3],['2 Timothy','_all',4],['Acts','_all',10],
    ['Amos','_all',5],['Colossians','_all',3],['Daniel','_all',12],['Deuteronomy','_all',34],
    ['Ecclesiastes','_all',12],['Exodus','_all',33],['Ezekiel','_all',44],['Genesis','_all',49],
    ['Hebrews','_all',13],['Hosea','_all',14],['Isaiah','_all',66],['Jeremiah','_all',37],
    ['John','_all',21],['Joshua','_all',20],['Judges','_all',21],['Luke','_all',24],['Mark','_all',16],
    ['Matthew','_all',26],['Micah','_all',7],['Numbers','_all',35],['Proverbs','_all',31],
    ['Psalms','_all',148],['Romans','_all',12],['Song of Solomon','_all',8],['Titus','_all',3],
    ['Wisdom','_all',8],['Zechariah','_all',14]
  ]),
  'gregory-of-nyssa': _B([
    ['1 Corinthians','_all',15],['1 Samuel','_all',26],['1 Timothy','_all',6],['2 Corinthians','_all',6],
    ['Acts','_all',12],['Colossians','_all',3],['Deuteronomy','_all',34],['Ecclesiastes','_all',7],
    ['Ephesians','_all',4],['Exodus','_all',35],['Genesis','_all',29],['Hebrews','_all',12],
    ['Isaiah','_all',66],['John','_all',21],['Luke','_all',24],['Mark','_all',12],['Philippians','_all',2],
    ['Proverbs','_all',31],['Psalms','_all',148],['Romans','_all',14],['Song of Solomon','_all',6]
  ]),
  'alcuin-of-york': _B([
    ['John','_all',21],['Revelation','_all',21]
  ]),
  'aponius': _B([
    ['Isaiah','_all',59],['Song of Solomon','_all',8]
  ]),
  'chromatius-of-aquileia': _B([
    ['Genesis','_all',39],['Isaiah','_all',49],['Matthew','_all',27],['Wisdom','_all',16]
  ]),
  'gregory-of-elvira': _B([
    ['Song of Solomon','_all',3]
  ]),
  'haimo-of-auxerre': _B([
    ['2 Thessalonians','_all',3],['Jonah','_all',4]
  ]),
  'hippolytus-of-rome': _B([
    ['1 Corinthians','_all',15],['1 Peter','_all',4],['1 Timothy','_all',6],['2 Corinthians','_all',13],
    ['2 Peter','_all',3],['Acts','_all',28],['Colossians','_all',2],['Daniel','_all',13],['Ephesians','_all',5],
    ['Ezekiel','_all',3],['Galatians','_all',5],['Genesis','_all',49],['Hebrews','_all',12],['Isaiah','_all',53],
    ['John','_all',20],['Luke','_all',23],['Mark','_all',13],['Philippians','_all',3],['Proverbs','_all',30],
    ['Psalms','_all',139],['Revelation','_all',21],['Romans','_all',14],['Song of Solomon','_all',4]
  ]),
  'hilary-of-arles': _B([
    ['1 John','_all',5],['1 Peter','_all',5],['2 John','_all',1],['2 Peter','_all',3],['3 John','_all',1],
    ['James','_all',5],['Jude','_all',1]
  ]),
  'ishodad-of-merv': _B([
    ['1 John','_all',5],['1 Kings','_all',22],['2 Kings','_all',25],['Daniel','_all',12],['Isaiah','_all',66],
    ['Job','_all',42],['Joel','_all',3]
  ]),
  'julian-of-eclanum': _B([
    ['Job','_all',41]
  ]),
  'nicholas-of-lyra': _B([
    ['1 Thessalonians','_all',2],['2 Thessalonians','_all',3],['Revelation','_all',20]
  ]),
  'olympiodorus-of-alexandria': _B([
    ['Baruch','_all',6],['Ecclesiastes','_all',3],['Job','_all',42]
  ]),
  'paterius': _B([
    ['Deuteronomy','_all',33],['Exodus','_all',34],['Leviticus','_all',19],['Numbers','_all',35]
  ]),
  'philo-of-alexandria': _B([
    ['Genesis','_all',17]
  ]),
  'procopius-of-gaza': _B([
    ['Isaiah','_all',65],['Numbers','_all',34]
  ]),
  'rabanus-maurus': _B([
    ['Acts','_all',14],['Esther','_all',10],['Matthew','_all',28],['Sirach (Ecclesiasticus)','_all',51],['Wisdom','_all',19]
  ]),
  'remigius-of-auxerre': _B([
    ['Mark','_all',9],['Matthew','_all',28]
  ]),
  'robert-of-tombelaine': _B([
    ['Song of Solomon','_all',8]
  ]),
  'ticonius': _B([
    ['Revelation','_all',19]
  ]),
  'titus-of-bostra': _B([
    ['Luke','_all',22]
  ]),
  'pseudo-jerome': _B([
    ['Mark','_all',16]
  ]),
  'hesychius-of-jerusalem': _B([
    ['James','_all',5],['Job','_all',20],['Psalms','_all',50],['Wisdom','_all',13]
  ]),
  'photios-i-of-constantinople': _B([
    ['Hebrews','_all',13]
  ]),
  'john-damascene': _B([
    ['2 Timothy','_all',4],['Daniel','_all',12],['Ephesians','_all',4],['Exodus','_all',34],['Ezekiel','_all',44],
    ['Galatians','_all',2],['Genesis','_all',9],['Isaiah','_all',66],['John','_all',20],['Joshua','_all',5],
    ['Luke','_all',24],['Mark','_all',16],['Psalms','_all',135],['Romans','_all',11],['Wisdom','_all',14]
  ]),
  'chrysostom-homilies-on-matthew': _B([['Matthew','_all',28]]),
  'chrysostom-homilies-on-john': _B([['John','_all',21]]),
  'chrysostom-homilies-on-acts': _B([['Acts','_all',28]]),
  'chrysostom-homilies-on-romans': _B([['Romans','_all',16]]),
  'chrysostom-homilies-on-1-corinthians': _B([['1 Corinthians','_all',16]]),
  'chrysostom-homilies-on-2-corinthians': _B([['2 Corinthians','_all',13]]),
  'chrysostom-commentary-on-galatians': _B([['Galatians','_all',6]]),
  'chrysostom-homilies-on-ephesians': _B([['Ephesians','_all',6]]),
  'chrysostom-homilies-on-philippians': _B([['Philippians','_all',4]]),
  'chrysostom-homilies-on-colossians': _B([['Colossians','_all',4]]),
  'chrysostom-homilies-on-1-thessalonians': _B([['1 Thessalonians','_all',5]]),
  'chrysostom-homilies-on-2-thessalonians': _B([['2 Thessalonians','_all',3]]),
  'chrysostom-homilies-on-1-timothy': _B([['1 Timothy','_all',6]]),
  'chrysostom-homilies-on-2-timothy': _B([['2 Timothy','_all',4]]),
  'chrysostom-homilies-on-titus': _B([['Titus','_all',3]]),
  'chrysostom-homilies-on-philemon': _B([['Philemon','_all',1]]),
  'chrysostom-homilies-on-hebrews': _B([['Hebrews','_all',13]]),
  'augustine-homilies-on-first-john': _B([['1 John','_all',5]])
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
  if (p==='aug')      return RAW+'/data/structured-text/'+c.file;
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

/* Sectioned scripture works (Augustine's Tractates/expositions, the homily
   series): each section is bucketed into its Bible chapter, using the section
   heading ("Chapter I." / "Psalm XVI") when the text is a chapter-by-chapter
   commentary, and otherwise the first scripture reference to the target book —
   with a continuation fallback to the previous section's chapter. */
const ROMAN_NUM = s => {
  const t = String(s||'').toUpperCase().trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return parseInt(t,10);
  const map = { M:1000, D:500, C:100, L:50, X:10, V:5, I:1 };
  let total = 0, prev = 0;
  for (const ch of t){
    const v = map[ch] || 0;
    total += v;
    if (v > prev) total -= 2*prev;
    prev = v;
  }
  return total || null;
};
function normAug(bd, bookName){
  const out = [];
  const secs = (bd.data && bd.data.sections) || [];
  const want = String(bookName||'').trim();
  let lastCh = 0;
  secs.forEach(sec=>{
    const text = collectBlocks(sec).map(b=>b.trim()).filter(Boolean).join('\n\n');
    if (!text) return;
    /* the section title ("Chapter I." / "Psalm XVI") is authoritative; scripture
       references inside a section are cross-quotations and would mislead (a
       Tractate on John 15 quotes John 2). Fall back to refs, then to the
       previous section's chapter, for the untitled continuation pieces. */
    let ch = null;
    const mt = /^(?:Chapter|Psalm)\s+(\d+|[MDCLXVI]+)/i.exec(String(sec.title||''));
    if (mt) ch = ROMAN_NUM(mt[1]);
    if (!ch){
      const refs = Array.from(new Set(collectRefs(sec))).filter(Boolean);
      for (const r of refs){ const p = parseOsis(r); if (p.name===want && p.ch){ ch = p.ch; break; } }
    }
    if (!ch) ch = lastCh;
    lastCh = ch;
    const refsAll = Array.from(new Set(collectRefs(sec))).filter(Boolean);
    out.push({ chapter:ch||0, verse_range:null, verse_text:'', commentary_text:text, word_count:wc(text), title:String(sec.title||sec.label||'').trim(), cross_references:refsAll.slice(0,16) });
  });
  return out;
}
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
  else if (p==='aug')     entries = normAug(bd, ctx.bookName);
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