(() => {
  const LABELS = {
    music: '🎧 Music & DJs',
    food: '🍽️ Food & Drink',
    couples: '💞 Couples & Intimacy',
    sex_kink: '🔥 Sex & Kink',
    lgbtq: '🏳️‍🌈 LGBTQ+',
    wellness_beauty: '🧖 Wellness & Beauty',
    arts: '🎨 Arts & Performance',
    community: '🌈 Workshops, Games & Community'
  };

  const RULES = {
    lgbtq: ['lgbtq','lgbt','queer','gay','lesbian','bisexual','bi+','transgender','nonbinary','non-binary','genderqueer','gender fluid','gender-fluid','pride','drag','dyke','rainbow','sapphic'],
    sex_kink: ['kink','bdsm','fetish','erotic','sex positive','sex-positive','sexual','sex toy','sex toys','nudity','nude','orgasm','masturbat','cock','dick','pussy','vulva','penetrat','spank','bondage','dominatrix','dominant','submissive','rope','shibari','swinger','swinging','play party','seduction','strip','porn','adult only','mature audiences','polyamory','polyamorous','cnm'],
    couples: ['couples','couple','partner connection','partnered','partners','dating','speed dating','date night','relationship','relationships','romantic','romance','love language','connection for two','two-person','intimacy','intimate','sacred union','conscious relationship','tantric couple','tantra for couples'],
    music: ['dj','djs','deejay','music','musical','dance party','dancefloor','rave','house music','techno','disco','bass','electronic','edm','live band','band','concert','sound system','sound journey','sound bath','karaoke','jamboree','jam session','bluegrass','banjo jam','drum','drumming','singalong','singing circle'],
    food: ['food','pizza','taco','tacos','bbq','barbecue','breakfast','brunch','lunch','dinner','feast','meal','cook','cooking','chef','kitchen','restaurant','snack','dessert','ice cream','chocolate','coffee','tea','cocktail','cocktails','drink','drinks','beverage','beverages','beer','wine','juice','smoothie','hot sauce','pickle','pickles','pasta','sushi','bacon','slushie'],
    wellness_beauty: ['yoga','meditation','breathwork','breath work','breath workshop','sound healing','healing','wellness','somatic','massage','bodywork','reiki','energy healing','tarot','astrology','tea leaf reading','ceremony','spiritual','spirituality','mindfulness','mindful','therapy','therapeutic','mental health','fitness','workout','movement','stretch','pilates','sauna','cold plunge','beauty','makeup','hair','haircut','barber','braid','braiding','skincare','skin care','facial','nail','nails','spa','grooming'],
    arts: ['art','artist','gallery','painting','drawing','sculpt','sculpture','installation','performance','performing','theater','theatre','circus','acrobat','burlesque','cabaret','poetry','poem','spoken word','storytelling','photography','photo','film','movie','screening','fashion','costume','costuming','fire dance','fire performance','flow arts','poi','hoop','juggling','puppet','craft','crafting','weaving','ceramics','pottery','woodworking'],
    community: ['workshop','class','learn','learning','discussion','talk','panel','lecture','community','social','mixer','meetup','meet up','gathering','games','game night','tournament','competition','pickleball','volleyball','basketball','trivia','bingo','service','volunteer','orientation','support group','conversation','skill share','skillshare','teach','training','book club','language','swap','exchange']
  };

  const normalize = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  const textFor = e => normalize([
    e.title, e.description, e.print_description,
    e.event_type?.label, e.event_type?.abbr, e.category,
    e.camp, e.other_location, ...(e.tags || [])
  ].filter(Boolean).join(' | '));

  function classify(e) {
    const text = textFor(e);
    const scores = Object.fromEntries(Object.keys(RULES).map(k => [k, 0]));
    const hits = Object.fromEntries(Object.keys(RULES).map(k => [k, []]));
    for (const [category, terms] of Object.entries(RULES)) {
      for (const term of terms) {
        if (text.includes(term)) {
          scores[category] += term.includes(' ') ? 3 : 2;
          hits[category].push(term);
        }
      }
    }
    const type = normalize(e.event_type?.label || e.event_type?.abbr);
    if (type.includes('food') || type.includes('beverage')) scores.food += 4;
    if (type.includes('music')) scores.music += 4;
    if (type.includes('mature')) scores.sex_kink += 3;
    if (type.includes('workshop') || type.includes('class')) scores.community += 3;
    if (type.includes('performance')) scores.arts += 3;

    const priority = ['lgbtq','sex_kink','couples','food','music','wellness_beauty','arts','community'];
    let best = 'community', bestScore = 0;
    for (const category of priority) {
      if (scores[category] > bestScore) { best = category; bestScore = scores[category]; }
    }
    if (!bestScore) {
      if (/music|dance|dj/.test(type)) best = 'music';
      else if (/food|beverage|drink/.test(type)) best = 'food';
      else if (/performance|art/.test(type)) best = 'arts';
    }
    const tags = [];
    for (const category of priority) {
      if (scores[category] >= 2) tags.push(category);
      for (const hit of hits[category].slice(0, 3)) tags.push(hit);
    }
    return {category: best, tags: [...new Set(tags)].slice(0, 12)};
  }

  function decorate() {
    document.querySelectorAll('#category option').forEach(o => {
      if (LABELS[o.value]) o.textContent = LABELS[o.value];
    });
    document.querySelectorAll('#events article.event').forEach(card => {
      const add = card.querySelector('[data-add]');
      if (!add) return;
      const e = state.events.find(x => String(x.id) === String(add.dataset.add));
      if (!e) return;
      const tag = card.querySelector('.tag');
      if (tag) tag.textContent = LABELS[e.category] || e.category;
    });
  }

  function apply() {
    if (!Array.isArray(state?.events) || !state.events.length) return false;
    for (const e of state.events) {
      const r = classify(e);
      e.category = r.category;
      e.category_label = LABELS[r.category];
      e.category_tags = r.tags;
      e.tags = [...new Set([...(e.tags || []), ...r.tags])];
    }
    if (typeof populate === 'function') populate();
    if (typeof renderDateStrip === 'function') renderDateStrip();
    if (typeof renderExplore === 'function') renderExplore();
    if (typeof renderPlan === 'function') renderPlan();
    decorate();
    return true;
  }

  function start() {
    let attempts = 0;
    const tick = () => {
      attempts++;
      if (apply() || attempts > 40) return;
      setTimeout(tick, 100);
    };
    tick();
  }

  window.addEventListener('playa:events-loaded', () => setTimeout(apply, 0));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();