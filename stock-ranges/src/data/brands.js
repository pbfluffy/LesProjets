// Curated ticker -> consumer-facing brands, so a watchlist/wallet entry
// like "QSR" reads as "Tim Hortons, Burger King, Popeyes" instead of a
// bare ticker most people don't recognize. Each brand carries a `domain`
// used to fetch its real logo (Clearbit's free no-key logo endpoint,
// same idea as TickerLogo.jsx's per-ticker logo) — KnownFor.jsx falls
// back to a colored initial if that domain has no logo there. Best-effort
// and not exhaustive; a symbol with no entry here just shows no section.
function b(name, domain) {
  return { name, domain }
}

export const BRANDS = {
  QSR: [b('Tim Hortons', 'timhortons.com'), b('Burger King', 'bk.com'), b('Popeyes', 'popeyes.com'), b('Firehouse Subs', 'firehousesubs.com')],
  MCD: [b('McDonald’s', 'mcdonalds.com')],
  SBUX: [b('Starbucks', 'starbucks.com')],
  YUM: [b('KFC', 'kfc.com'), b('Pizza Hut', 'pizzahut.com'), b('Taco Bell', 'tacobell.com'), b('Habit Burger', 'habitburger.com')],
  CMG: [b('Chipotle', 'chipotle.com')],
  DPZ: [b('Domino’s Pizza', 'dominos.com')],
  WEN: [b('Wendy’s', 'wendys.com')],
  DRI: [b('Olive Garden', 'olivegarden.com'), b('LongHorn Steakhouse', 'longhornsteakhouse.com'), b('Cheddar’s', 'cheddars.com')],
  CAKE: [b('The Cheesecake Factory', 'thecheesecakefactory.com')],
  DIN: [b('Applebee’s', 'applebees.com'), b('IHOP', 'ihop.com')],
  SHAK: [b('Shake Shack', 'shakeshack.com')],

  KO: [b('Coca-Cola', 'coca-cola.com'), b('Sprite', 'sprite.com'), b('Fanta', 'fanta.com'), b('Minute Maid', 'minutemaid.com'), b('Dasani', 'dasani.com'), b('Powerade', 'powerade.com')],
  PEP: [b('Pepsi', 'pepsi.com'), b('Frito-Lay', 'fritolay.com'), b('Lay’s', 'lays.com'), b('Doritos', 'doritos.com'), b('Gatorade', 'gatorade.com'), b('Quaker', 'quakeroats.com'), b('Mountain Dew', 'mountaindew.com')],
  KDP: [b('Keurig', 'keurig.com'), b('Dr Pepper', 'drpepper.com'), b('Snapple', 'snapple.com'), b('7Up', '7up.com')],
  MNST: [b('Monster Energy', 'monsterenergy.com')],
  STZ: [b('Corona', 'corona.com'), b('Modelo', 'modelousa.com'), b('Svedka', 'svedkavodka.com')],
  BUD: [b('Budweiser', 'budweiser.com'), b('Corona', 'corona.com'), b('Stella Artois', 'stellaartois.com'), b('Michelob', 'michelobultra.com')],
  TAP: [b('Coors', 'coors.com'), b('Miller', 'millerlite.com'), b('Blue Moon', 'bluemoonbrewingcompany.com')],
  DEO: [b('Johnnie Walker', 'johnniewalker.com'), b('Guinness', 'guinness.com'), b('Smirnoff', 'smirnoff.com'), b('Baileys', 'baileys.com'), b('Captain Morgan', 'captainmorgan.com')],

  PG: [b('Tide', 'tide.com'), b('Pampers', 'pampers.com'), b('Gillette', 'gillette.com'), b('Crest', 'crest.com'), b('Pantene', 'pantene.com'), b('Old Spice', 'oldspice.com')],
  KMB: [b('Kleenex', 'kleenex.com'), b('Huggies', 'huggies.com'), b('Cottonelle', 'cottonelle.com'), b('Scott', 'scottbrand.com')],
  CL: [b('Colgate', 'colgate.com'), b('Palmolive', 'palmolive.com'), b('Speed Stick', 'speedstick.com')],
  UL: [b('Dove', 'dove.com'), b('Axe', 'axe.com'), b('Ben & Jerry’s', 'benjerry.com'), b('Hellmann’s', 'hellmanns.com'), b('Lipton', 'lipton.com')],
  CLX: [b('Clorox', 'clorox.com'), b('Pine-Sol', 'pinesol.com'), b('Burt’s Bees', 'burtsbees.com')],
  CHD: [b('Arm & Hammer', 'armandhammer.com'), b('Trojan', 'trojancondoms.com'), b('OxiClean', 'oxiclean.com')],
  EL: [b('Estée Lauder', 'esteelauder.com'), b('MAC', 'maccosmetics.com'), b('Clinique', 'clinique.com'), b('Bobbi Brown', 'bobbibrowncosmetics.com')],

  MDLZ: [b('Oreo', 'oreo.com'), b('Cadbury', 'cadbury.com'), b('Ritz', 'ritzcrackers.com'), b('Toblerone', 'toblerone.com'), b('Trident', 'tridentgum.com')],
  HSY: [b('Hershey’s', 'hersheys.com'), b('Reese’s', 'reeses.com'), b('Kit Kat', 'kitkat.com'), b('Jolly Rancher', 'jollyrancher.com')],
  GIS: [b('Cheerios', 'cheerios.com'), b('Betty Crocker', 'bettycrocker.com'), b('Pillsbury', 'pillsbury.com'), b('Häagen-Dazs', 'haagen-dazs.us')],
  K: [b('Pringles', 'pringles.com'), b('Pop-Tarts', 'poptarts.com'), b('Cheez-It', 'cheezit.com'), b('Eggo', 'eggo.com')],
  KHC: [b('Heinz', 'heinz.com'), b('Kraft', 'kraft.com'), b('Oscar Mayer', 'oscarmayer.com'), b('Philadelphia', 'philadelphiacreamcheese.com'), b('Jell-O', 'jello.com')],
  CAG: [b('Slim Jim', 'slimjim.com'), b('Chef Boyardee', 'chefboyardee.com'), b('Marie Callender’s', 'mariecallendars.com')],
  CPB: [b('Campbell’s', 'campbells.com'), b('Pepperidge Farm', 'pepperidgefarm.com'), b('Prego', 'prego.com'), b('V8', 'v8juice.com')],

  NKE: [b('Nike', 'nike.com'), b('Converse', 'converse.com'), b('Jordan', 'nike.com')],
  LULU: [b('Lululemon', 'lululemon.com')],
  VFC: [b('Vans', 'vans.com'), b('The North Face', 'thenorthface.com'), b('Timberland', 'timberland.com')],
  CROX: [b('Crocs', 'crocs.com')],
  DECK: [b('UGG', 'ugg.com'), b('Hoka', 'hoka.com')],
  UAA: [b('Under Armour', 'underarmour.com')],
  RL: [b('Ralph Lauren', 'ralphlauren.com')],
  TPR: [b('Coach', 'coach.com'), b('Kate Spade', 'katespade.com')],
  LVMUY: [b('Louis Vuitton', 'louisvuitton.com'), b('Moët & Chandon', 'moet.com'), b('Dior', 'dior.com'), b('Tiffany & Co.', 'tiffany.com')],

  WMT: [b('Walmart', 'walmart.com'), b('Sam’s Club', 'samsclub.com')],
  TGT: [b('Target', 'target.com')],
  COST: [b('Costco', 'costco.com'), b('Kirkland Signature', 'costco.com')],
  HD: [b('The Home Depot', 'homedepot.com')],
  LOW: [b('Lowe’s', 'lowes.com')],
  TJX: [b('TJ Maxx', 'tjmaxx.com'), b('Marshalls', 'marshalls.com'), b('HomeGoods', 'homegoods.com')],
  ROST: [b('Ross Dress for Less', 'rossstores.com')],
  BBY: [b('Best Buy', 'bestbuy.com')],
  ULTA: [b('Ulta Beauty', 'ulta.com')],

  AMZN: [b('Amazon', 'amazon.com'), b('Whole Foods', 'wholefoodsmarket.com'), b('Prime Video', 'primevideo.com'), b('Zappos', 'zappos.com'), b('Audible', 'audible.com'), b('Twitch', 'twitch.tv')],
  AAPL: [b('iPhone', 'apple.com'), b('Mac', 'apple.com'), b('iPad', 'apple.com'), b('AirPods', 'apple.com'), b('Apple Watch', 'apple.com')],
  GOOGL: [b('Google', 'google.com'), b('YouTube', 'youtube.com'), b('Android', 'android.com'), b('Gmail', 'gmail.com')],
  GOOG: [b('Google', 'google.com'), b('YouTube', 'youtube.com'), b('Android', 'android.com'), b('Gmail', 'gmail.com')],
  META: [b('Facebook', 'facebook.com'), b('Instagram', 'instagram.com'), b('WhatsApp', 'whatsapp.com')],
  MSFT: [b('Windows', 'microsoft.com'), b('Office', 'microsoft.com'), b('Xbox', 'xbox.com'), b('LinkedIn', 'linkedin.com'), b('GitHub', 'github.com')],
  NFLX: [b('Netflix', 'netflix.com')],
  DIS: [b('Disney', 'disney.com'), b('Pixar', 'pixar.com'), b('Marvel', 'marvel.com'), b('ESPN', 'espn.com'), b('Hulu', 'hulu.com')],
  SONY: [b('PlayStation', 'playstation.com')],
  SPOT: [b('Spotify', 'spotify.com')],
  NVDA: [b('GeForce', 'geforce.com'), b('RTX', 'nvidia.com'), b('Shield TV', 'nvidia.com')],
  AMD: [b('Ryzen', 'amd.com'), b('Radeon', 'amd.com')],
  INTC: [b('Intel Core', 'intel.com')],
  ADBE: [b('Photoshop', 'adobe.com'), b('Acrobat', 'adobe.com'), b('Premiere Pro', 'adobe.com')],

  JNJ: [b('Band-Aid', 'band-aid.com'), b('Tylenol', 'tylenol.com'), b('Neutrogena', 'neutrogena.com'), b('Listerine', 'listerine.com')],
  PM: [b('Marlboro', 'marlboro.com'), b('IQOS', 'iqos.com')],
  MO: [b('Marlboro', 'marlboro.com'), b('Copenhagen', 'copenhagen.com')],

  F: [b('Ford', 'ford.com'), b('Lincoln', 'lincoln.com')],
  GM: [b('Chevrolet', 'chevrolet.com'), b('Cadillac', 'cadillac.com'), b('GMC', 'gmc.com'), b('Buick', 'buick.com')],
  TSLA: [b('Tesla', 'tesla.com')],
  TM: [b('Toyota', 'toyota.com'), b('Lexus', 'lexus.com')],
  HMC: [b('Honda', 'honda.com'), b('Acura', 'acura.com')],
  STLA: [b('Jeep', 'jeep.com'), b('Ram', 'ramtrucks.com'), b('Chrysler', 'chrysler.com'), b('Dodge', 'dodge.com')],

  'BRK-B': [b('GEICO', 'geico.com'), b('Dairy Queen', 'dairyqueen.com'), b('See’s Candies', 'sees.com'), b('Duracell', 'duracell.com'), b('Fruit of the Loom', 'fruit.com')],
  'BRK-A': [b('GEICO', 'geico.com'), b('Dairy Queen', 'dairyqueen.com'), b('See’s Candies', 'sees.com'), b('Duracell', 'duracell.com'), b('Fruit of the Loom', 'fruit.com')],

  YETI: [b('Yeti', 'yeti.com')],
}
