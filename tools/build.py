"""Builds the pages that share the home page's header, footer and pop-ups.

Run from the project folder:   python tools/build.py

index.html is the source for the shared parts. This script writes church.html, bible.html
and seat.html, and js/content-fields.js (the list of fields the admin page can edit, with
the wording each one starts with). Edit wording here or in index.html, then run it again.
"""
import io, json, html, re, os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = io.open(root + "/index.html", encoding="utf-8").read()
top, rest = src.split('<main id="main">', 1)
_, bottom = rest.split("</main>", 1)
top = top.replace('<body class="has-hero">', "<body>", 1)
E = html.escape
ARR = '<span class="arr" aria-hidden="true">&rarr;</span>'
HP = '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
FIELDS = []


def field(group, key, label, value, kind="text", hint=""):
    FIELDS.append({"group": group, "key": key, "label": label, "type": kind, "value": value, "hint": hint})


def page(fname, title, desc, body, robots=None):
    t = top.replace("<title>Heritage Baptist Church, Matamata</title>", "<title>%s | Heritage Baptist Church</title>" % title)
    start = t.index('<meta name="description" content="') + len('<meta name="description" content="')
    end = t.index('"', start)
    t = t[:start] + desc + t[end:]
    if robots:
        t = t.replace('<meta name="viewport"', '<meta name="robots" content="%s">\n<meta name="viewport"' % robots, 1)
    t = t.replace('<a class="nav-top" href="%s">' % fname, '<a class="nav-top" href="%s" aria-current="page">' % fname, 1)
    io.open(root + "/" + fname, "w", encoding="utf-8", newline="\n").write(t + '<main id="main">\n' + body + "\n</main>" + bottom)


def paras_html(text):
    out = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            out.append("<h4>%s</h4>" % E(line[3:]))
        elif line.startswith("> "):
            out.append('<p class="creed-refs">%s</p>' % E(line[2:]))
        else:
            out.append("<p>%s</p>" % E(line))
    return "".join(out)


def verses_html(text):
    out = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        cut = line.rfind(" - ")
        if cut == -1:
            out.append('<p class="hb-scripture">%s</p>' % E(line))
        else:
            out.append('<p class="hb-scripture">%s <cite>- %s</cite></p>' % (E(line[:cut]), E(line[cut + 3:])))
    return "".join(out)


# ---------------- fields that live on the home page and in the header and footer ----------------
G = "Sundays and contact"
field(G, "sundays.times", "Sunday times (large)", "10am & 5pm")
field(G, "contact.address", "Where we meet", "Matamata-Piako Civic & Memorial Centre\n11 Tainui Street, Matamata 3400", "long", "One line per row.")
field(G, "footer.times", "Service times in the footer", "Sundays 10am & 5pm\nThursday prayer meeting 7pm", "long", "One line per row.")
field(G, "contact.phone", "Phone number", "027 339 4078")
field(G, "contact.email", "Email address", "info@heritagebc.org.nz")
G = "Sunday schedule"
for n, (t, title, det) in enumerate([
    ("10AM", "Bible study", "Sunday school for kids\nBible study for intermediates"),
    ("11AM", "Service", "Creche\nBible teaching for kids"),
    ("12PM", "Lunch together", "Enjoy what we’ve prepared, or bring your favourite dish to share"),
    ("5PM", "Evening service", None)], 1):
    field(G, "sched.%d.time" % n, "Row %d time" % n, t)
    field(G, "sched.%d.title" % n, "Row %d title" % n, title)
    if det is not None:
        field(G, "sched.%d.details" % n, "Row %d details" % n, det, "long", "Shown when the row is opened. One line per row.")
G = "Home page"
field(G, "home.verse", "Verse", "“Search the scriptures; for in them ye think ye have eternal life: and they are they which testify of me.”", "long")
field(G, "home.verse_ref", "Verse reference", "John 5:39")
field(G, "img.sundays_family", "Sundays photo: church family", "assets/imagery/group-crop.jpg", "image")
field(G, "img.sundays_service", "Sundays photo: service", "assets/imagery/service-band.jpg", "image")

# ---------------- content first pulled from the old site, saved in content/current-site.json ----------------
items = json.load(io.open(root + "/content/current-site.json", encoding="utf-8"))


def find(tag, text):
    for i, (t, x) in enumerate(items):
        if t == tag and x.strip() == text:
            return i
    raise KeyError(text)


G = "Plan a visit"
VISIT_THURSDAY = "Thursday prayer meeting 7pm"
VISIT_BODY = (
    "Come to the Matamata-Piako Civic and Memorial Centre a few minutes before 10am. Someone will meet you at the door and show you to a seat.\n"
    "At 10am there is Bible study, with Sunday school for the kids. The service follows at 11am, with hymns and preaching from the Bible. There is a creche for little ones and Bible teaching for children. At 12pm we share lunch, and you are welcome to stay.\n"
    "On Sunday evenings at 5pm we meet again for another service. On Thursdays at 7pm we meet to pray together."
)
field(G, "visit.thursday", "Thursday line", VISIT_THURSDAY)
field(G, "visit.body", "What a visit is like", VISIT_BODY, "long", "One paragraph per line.")

G = "Our story"
story ="\n".join(x for t, x in items[: find("h1", "Our Purpose")] if t == "p" and x.startswith("The "))
field(G, "story.body", "Our story", story, "long", "One paragraph per line.")
field(G, "img.story", "Our story photo", "assets/imagery/group-crop.jpg", "image")

G = "Our pastors"
pastors_html = []
for n, name in enumerate(["Josh Szwarga", "Limuel Daisa"], 1):
    i = find("h4", name)
    role = items[i + 1][1]
    bio = []
    for t, x in items[i + 2:]:
        if t != "p":
            break
        bio.append(x)
    bio = "\n".join(bio)
    field(G, "pastor%d.name" % n, "Pastor %d name" % n, name)
    field(G, "pastor%d.role" % n, "Pastor %d title" % n, role)
    field(G, "pastor%d.bio" % n, "Pastor %d bio" % n, bio, "long", "One paragraph per line.")
    field(G, "img.pastor%d" % n, "Pastor %d photo" % n, "", "image", "Optional. Shown above the name once a photo is added.")
    pastors_html.append('''      <div class="pastor reveal">
        <div class="hb-frame pastor-photo" hidden><img alt="" data-c-img="img.pastor%d"></div>
        <h3 data-c="pastor%d.name">%s</h3>
        <p class="label" data-c="pastor%d.role">%s</p>
        <div class="pastor-bio" data-c-paras="pastor%d.bio">%s</div>
      </div>''' % (n, n, E(name), n, E(role), n, paras_html(bio)))
pastors_html = "\n".join(pastors_html)

# God's truth about us: from the back of the 2026 flyer
G = "God’s truth about us"
TRUTH = [
    ("All of us know that God is real",
     "“For the invisible things of him from the creation of the world are clearly seen, being understood by the things that are made...so that they are without excuse.” - Romans 1:20"),
    ("All of us are guilty before God",
     "“They glorified him not as God, neither were thankful; but became vain in their imaginations, and their foolish heart was darkened. Professing themselves to be wise, they became fools.” - Romans 1:21-22\n"
     "“There is none righteous, no, not one...Whose mouth is full of cursing and bitterness...And the way of peace have they not known: There is no fear of God before their eyes.” - Romans 3:10-18"),
    ("All of us must pay for this great sin",
     "“For the wages of sin is death...And death and hell were cast into the lake of fire. This is the second death.” - Romans 6:23 & Revelation 20:14"),
    ("None of us can earn God’s forgiveness",
     "“Therefore by the deeds of the law there shall no flesh be justified in his sight.” - Romans 3:20\n"
     "“For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.” - Ephesians 2:8-9"),
    ("All of us have a way to God’s forgiveness",
     "“Even the righteousness of God which is by faith of Jesus Christ unto all and upon all them that believe.” - Romans 3:22\n"
     "“For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.” - John 3:16"),
    ("All of us must come to God through Jesus",
     "“That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.” - Romans 10:9\n"
     "“Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.” - John 14:6"),
]
truth_html = []
for n, (h, v) in enumerate(TRUTH, 1):
    field(G, "truth.%d.title" % n, "Point %d heading" % n, h)
    field(G, "truth.%d.verses" % n, "Point %d verses" % n, v, "long", "One verse per line, ending with a spaced hyphen and the reference.")
    truth_html.append('''      <div class="hb-point reveal">
        <h3 data-c="truth.%d.title">%s</h3>
        <div data-c-verses="truth.%d.verses">%s</div>
      </div>''' % (n, E(h), n, verses_html(v)))
truth_html = "\n".join(truth_html)
STUDY_NOTE = "Or text Pastor Josh 027 339 4078 or Pastor Lim 021 0295 4744 to get a cuppa or to learn more about God’s gift of forgiveness."
field(G, "study.note", "Line under the Bible study button", STUDY_NOTE, "long", "Phone numbers become tap-to-text links.")


def linkphones_html(text):
    def link(m):
        digits = re.sub(r"\D", "", m.group(0))
        return '<a href="sms:+64%s">%s</a>' % (digits[1:], m.group(0))
    return re.sub(r"\b0\d[\d ]{6,12}\d\b", link, E(text))


# Statement of faith: from "The Bible" up to "Contact Us"
G = "What we believe"
a, b = find("h2", "The Bible"), find("h2", "Contact Us")
REF = re.compile(r"^[1-3]?\s?[A-Z][a-z]+\.? \d+:\d")
creed, cur = [], None
for t, x in items[a:b]:
    if t == "h2":
        cur = [x, []]
        creed.append(cur)
    elif len(x) < 30 and not x.endswith("."):
        cur[1].append("## " + x)
    elif REF.match(x) and ";" in x:
        cur[1].append("> " + x)
    else:
        cur[1].append(x)
creed_html = []
for n, (title, lines) in enumerate(creed, 1):
    body = "\n".join(lines)
    field(G, "believe.%d.title" % n, "Section %d heading" % n, title)
    field(G, "believe.%d.body" % n, "Section %d text" % n, body, "long", "One paragraph per line. Start a line with ## for a sub-heading, or > for the scripture references.")
    creed_html.append('''      <details class="creed">
        <summary><span data-c="believe.%d.title">%s</span><i aria-hidden="true"></i></summary>
        <div class="creed-body" data-c-paras="believe.%d.body">%s</div>
      </details>''' % (n, E(title), n, paras_html(body)))
creed_html = "\n".join(creed_html)

# ---------------- pages ----------------
page("church.html", "Our Church", "Plan a visit, our story, our pastors and how to contact Heritage Baptist Church, Matamata.", """
  <h1 class="sr-only">Our Church</h1>
  <nav class="jump" aria-label="On this page"><div class="wrap jump-row">
    <a href="#visit">Plan a visit</a>
    <a href="#story">Our story</a>
    <a href="#pastors">Our pastors</a>
    <a href="#contact">Contact</a>
  </div></nav>

  <section class="block" id="visit"><div class="wrap">
    <div class="visit-row reveal">
      <div>
        <p class="times">Sundays <span data-c="sundays.times">10am &amp; 5pm</span></p>
        <p class="visit-thursday" data-c="visit.thursday">""" + E(VISIT_THURSDAY) + """</p>
        <address class="label" style="margin-top:var(--space-4)" data-c-lines="contact.address">Matamata-Piako Civic &amp; Memorial Centre<br>11 Tainui Street, Matamata 3400</address>
      </div>
      <div><a class="hb-button" href="seat.html" data-open-visit>Plan a visit """ + ARR + """</a></div>
    </div>
    <div class="prose reveal" data-c-paras="visit.body">""" + paras_html(VISIT_BODY) + """</div>
  </div></section>

  <section class="block" id="story"><div class="wrap">
    <h2 class="sec-title reveal">Our story</h2>
    <div class="story-grid">
      <div class="prose reveal" data-c-paras="story.body">""" + paras_html(story) + """</div>
      <div class="hb-frame wipe" style="aspect-ratio:3/2;height:auto"><img src="assets/imagery/group-crop.jpg" alt="Members of the church family standing together, smiling" loading="lazy" data-c-img="img.story"></div>
    </div>
  </div></section>

  <section class="block" id="pastors"><div class="wrap">
    <h2 class="sec-title reveal">Our pastors</h2>
    <div class="pastors">
""" + pastors_html + """
    </div>
  </div></section>

  <section class="block" id="contact"><div class="wrap">
    <h2 class="sec-title reveal">Contact</h2>
    <div class="contact-grid">
      <form class="form reveal" data-form="message">
        """ + HP + """
        <div class="field"><label for="c-name">Name</label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="c-mobile">Mobile (optional)</label><input id="c-mobile" name="mobile" type="tel" autocomplete="tel" inputmode="tel"></div>
        <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="details" required></textarea></div>
        <div><button class="hb-button" type="submit">Send message """ + ARR + """</button></div>
        <p class="small form-note" role="status"></p>
      </form>
    </div>
  </div></section>
""")

page("bible.html", "The Bible", "Request a Bible study, read God's truth about us, and see what Heritage Baptist Church believes.", """
  <h1 class="sr-only">The Bible</h1>
  <nav class="jump" aria-label="On this page"><div class="wrap jump-row">
    <a href="#truth">God’s truth about us</a>
    <a href="#study">Request a Bible study</a>
    <a href="#believe">What we believe</a>
  </div></nav>

  <section class="block" id="truth"><div class="wrap">
    <h2 class="sec-title reveal">God’s truth about us</h2>
    <div class="hb-points">
""" + truth_html + """
    </div>
  </div></section>

  <section class="block block-join" id="study"><div class="wrap">
    <h2 class="sr-only">Request a Bible study</h2>
    <div class="reveal"><a class="hb-button" href="church.html#contact" data-open-study>Request a Bible study with one of our pastors """ + ARR + """</a></div>
    <p class="lead reveal" data-c-linkphones="study.note">""" + linkphones_html(STUDY_NOTE) + """</p>
  </div></section>

  <section class="block" id="believe"><div class="wrap">
    <h2 class="sec-title reveal">What we believe</h2>
    <div class="creeds reveal">
""" + creed_html + """
    </div>
  </div></section>
""")

# Save a seat: the visit form as its own page, for flyers and texts. Not linked from the menus, and hidden from search engines.
i = src.index('<form class="form" data-form="visit">')
j = src.index("</form>", i) + len("</form>")
seat_form = src[i:j].replace('id="v-', 'id="sv-').replace('for="v-', 'for="sv-')
page("seat.html", "Save a seat", "Tell us you are coming on Sunday and we will save you a seat at Heritage Baptist Church, Matamata.", """
  <section class="seat"><div class="wrap seat-grid">
    <div>
      <h1 class="hb-headline seat-title"><span class="hb-md">Save a</span><span class="hb-lg">Seat</span></h1>
      <p class="times seat-times">Sundays <span data-c="sundays.times">10am &amp; 5pm</span></p>
      <address class="label" data-c-lines="contact.address">Matamata-Piako Civic &amp; Memorial Centre<br>11 Tainui Street, Matamata 3400</address>
    </div>
    <div class="seat-card">
      """ + seat_form + """
    </div>
  </div></section>
""", robots="noindex")

io.open(root + "/js/content-fields.js", "w", encoding="utf-8", newline="\n").write(
    "// Written by tools/build.py. The fields the admin page can edit, with the wording each starts with.\nwindow.HBC_FIELDS = "
    + json.dumps(FIELDS, ensure_ascii=False, indent=1) + ";\n")
print("built church.html, bible.html, seat.html and js/content-fields.js (%d editable fields)" % len(FIELDS))
