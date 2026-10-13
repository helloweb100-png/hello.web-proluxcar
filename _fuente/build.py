"""Proluxcar · arma index.html a partir de template.html + datos reales del catálogo (PDF del cliente).
styles.css y script.js se escriben a mano (no pasan por aquí)."""
import json, re, sys
from html import escape as esc
from pathlib import Path

SRC = Path(__file__).parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC.parent / "site"
SHOW_PRICES = True          # False -> oculta precios y totales en toda la web
WA = "529542065113"         # +52 1 954 206 5113 (visto en la captura del chat) -> CONFIRMAR con el cliente

CATS = [
    ("lavado", "Lavado"),
    ("proteccion", "Protección y brillo"),
    ("interior", "Interiores y cristales"),
    ("pesada", "Limpieza pesada"),
    ("exterior", "Llantas y plásticos"),
    ("herramientas", "Herramientas"),
]
CATNAME = dict(CATS)

# id, marca, tipo, nombre completo (para WhatsApp), cat, presentación, pH, precio mayoreo, base(unidad), minQty, color RGB, descripción, specs[[k,v]]
P = [
    dict(id="storm-pink", brand="Storm Pink", type="Shampoo cerámico", name="Shampoo Cerámico Storm Pink", cat="lavado", pres="1 L", ph="pH neutro", price=85, tint="255,79,163",
         desc="Cuida y protege la pintura creando una protección hidrofóbica. Diseñado para prelavado con espumador y lavado en cubeta.",
         specs=[["Presentación", "1 litro"], ["pH", "Neutro"], ["Dilución", "1:4 en espumador · 50 ml por cubeta"], ["Acabado", "Protección hidrofóbica"], ["Recomendación", "Trabajar siempre en sombra"]]),
    dict(id="bubble-blue", brand="Bubble Blue", type="Shampoo neutro", name="Shampoo Neutro Bubble Blue", cat="lavado", pres="1 L", ph="pH neutro", price=68, tint="63,169,255",
         desc="Shampoo neutro concentrado, ideal para el prelavado: desprende la suciedad antes del lavado de contacto.",
         specs=[["Presentación", "1 litro"], ["pH", "Neutro"], ["Dilución", "1:4 en espumador · 50 ml por cubeta"], ["Uso", "Prelavado"], ["Recomendación", "Trabajar siempre en sombra"]]),
    dict(id="storm-red", brand="Storm Red", type="Shampoo alcalino", name="Shampoo Alcalino Storm Red", cat="lavado", pres="1 L", ph="pH alcalino", price=88, tint="255,59,78",
         desc="Shampoo alcalino para prelavado con espumador: elimina la suciedad pesada antes del lavado de contacto.",
         specs=[["Presentación", "1 litro"], ["pH", "Alcalino"], ["Dilución", "Según qué tan sucio esté el auto"], ["Uso", "Prelavado con espumador"], ["Precaución", "Trabajar en sombra para evitar el secado sobre la pintura"]]),
    dict(id="canon-espuma", brand="Cañón de espuma", type="Prelavado", name="Cañón de Espuma", cat="lavado", pres="1 L", ph="Con accesorios", price=500, base=650, minQty=6, tint="140,200,255",
         desc="Cañón de espuma de 1 litro con sus accesorios. Ideal para el prelavado, bañando el auto con espuma densa.",
         specs=[["Capacidad", "1 litro"], ["Incluye", "Accesorios"], ["Uso", "Prelavado con espuma densa"], ["Mayoreo", "$500 desde 6 piezas · unidad $650"]]),
    dict(id="nova-wax", brand="Nova Wax", type="Cera líquida", name="Cera Líquida Nova Wax", cat="proteccion", pres="500 ml", ph="pH neutro", price=85, tint="255,210,31",
         desc="Cera líquida concentrada para usar como lavado final: deja una capa protectora que cuida la pintura de los rayos UV y la suciedad.",
         specs=[["Presentación", "500 ml, lista para usar"], ["pH", "Neutro"], ["Uso", "Lavado final"], ["Protección", "Rayos UV y suciedad"]]),
    dict(id="ceramix-polish", brand="Ceramix Polish", type="Crema pulidora", name="Ceramix Polish", cat="proteccion", pres="200 g", ph="Acabado espejo", price=88, tint="255,179,71",
         desc="Crema diseñada para quitar rayones superficiales y dar un terminado espejo, para que la pintura vuelva a lucir como nueva.",
         specs=[["Presentación", "200 g"], ["Textura", "Cremosa, se trabaja con microfibra"], ["Resultado", "Quita rayones superficiales · acabado espejo"], ["Recomendación", "Trabajar siempre en sombra"]]),
    dict(id="hydroshield", brand="Hydroshield", type="Crema quita gotas", name="Hydroshield Crema Quita Gotas", cat="proteccion", pres="200 g", ph="Cristales", price=120, tint="163,91,255",
         desc="Quita la suciedad por residuos o lluvia ácida en cristales, parabrisas y espejos.",
         specs=[["Presentación", "200 g"], ["Uso", "Cristales, parabrisas y espejos"], ["Resultado", "Elimina residuos y lluvia ácida"], ["Recomendación", "Trabajar siempre en sombra"]]),
    dict(id="glass-cleaner", brand="Glass Cleaner", type="Limpiador de cristales", name="Limpiador Glass Cleaner", cat="interior", pres="500 ml", ph="Sin rayones", price=95, tint="79,216,255",
         desc="Limpia pantallas y superficies delicadas: teléfonos, pantallas táctiles, tableros y cristales. Elimina la suciedad grasosa sin dejar rayones.",
         specs=[["Presentación", "500 ml"], ["Superficies", "Pantallas, tableros, cristales"], ["Resultado", "Sin rayones, incluso en acabado piano"]]),
    dict(id="apc-cleaner", brand="APC Cleaner", type="Limpiador de interiores", name="APC Cleaner", cat="interior", pres="500 ml", ph="pH neutro", price=85, tint="255,138,31",
         desc="Limpiador de interiores para plásticos, piel, telas y toldo. Mucha espuma y agradable aroma a cítricos; rinde con poca cantidad.",
         specs=[["Presentación", "500 ml"], ["pH", "Neutro (seguro en cualquier superficie interna)"], ["Superficies", "Plásticos, piel, telas y toldo"], ["Aroma", "Cítricos"]]),
    dict(id="int-shine", brand="Int Shine", type="Abrillantador de plásticos", name="Int Shine Abrillantador de Plásticos", cat="interior", pres="500 ml", ph="pH neutro", price=88, tint="52,224,192",
         desc="Restaurador y protector de plásticos interiores a base de silicones, con diferentes aromas. Con poca cantidad se logran resultados profesionales.",
         specs=[["Presentación", "500 ml"], ["pH", "Neutro"], ["Base", "Silicones"], ["Aromas", "Varios, agradables"], ["Superficies", "Plásticos internos"]]),
    dict(id="black-mamba-crema", brand="Black Mamba Crema", type="Restaurador · interiores", name="Restaurador de Plásticos Black Mamba (crema)", cat="interior", pres="500 ml", ph="Base agua", price=88, tint="225,29,46",
         desc="Crema a base de agua con agradable aroma, diseñada para restaurar y abrillantar interiores. También sirve en exteriores para los amantes del terminado brillante.",
         specs=[["Presentación", "500 ml"], ["Base", "Agua"], ["Acabado", "Brillante"], ["Uso", "Interiores y exteriores"]]),
    dict(id="aromatizante", brand="Aromatizante", type="Variedad de aromas", name="Aromatizante para Auto", cat="interior", pres="250 ml", ph="Ambiente fresco", price=55, minQty=12, tint="255,110,64",
         desc="Aromatizante en spray para el auto, en variedad de aromas. Fragancia premium de larga duración que neutraliza los malos olores y deja un ambiente fresco.",
         specs=[["Presentación", "250 ml, en spray"], ["Aromas", "Variedad de aromas"], ["Fragancia", "Premium, de larga duración"], ["Efecto", "Ambiente fresco · neutraliza malos olores"], ["Mayoreo", "$55 por pieza · caja con 12 piezas"], ["Precaución", "Evitar contacto con ojos y vías respiratorias · fuera del alcance de los niños"]]),
    dict(id="black-mamba-gel", brand="Black Mamba Gel", type="Restaurador · exteriores", name="Restaurador de Plásticos Black Mamba (gel)", cat="exterior", pres="500 ml", ph="Efecto natural", price=88, tint="225,29,46",
         desc="Gel a base de solvente para plásticos exteriores: fascias, molduras y plásticos del motor. Devuelve el color original a los plásticos deteriorados por el sol.",
         specs=[["Presentación", "500 ml"], ["Base", "Solvente"], ["Acabado", "Natural"], ["Uso", "Fascias, molduras y plásticos del motor"]]),
    dict(id="tireshine", brand="Tireshine", type="Abrillantador de llantas", name="Abrillantador para Llantas Tireshine", cat="exterior", pres="500 ml", ph="Hidrofóbico", price=88, tint="255,210,31",
         desc="Abrillantador en gel para llantas, a base de agua y con efecto hidrofóbico: da brillo y protege contra agua y polvo, con terminación de efecto mojado.",
         specs=[["Presentación", "500 ml"], ["Base", "Agua · efecto hidrofóbico"], ["Acabado", "Mojado y brilloso"], ["Aplicación", "Descontamina y limpia antes; deja reposar 15 min antes de mover el auto"]]),
    dict(id="all-cleaner", brand="All Cleaner", type="APC multipropósito en gel", name="All Cleaner APC Multipropósito en Gel", cat="pesada", pres="960 ml", ph="pH alcalino", price=88, tint="182,255,46",
         desc="Limpiador multipropósito en gel para exterior e interior. Su fórmula concentrada elimina cualquier tipo de suciedad en plásticos, telas, metal y tapetes.",
         specs=[["Presentación", "960 ml"], ["pH", "Alcalino"], ["Uso", "Exterior e interior"], ["Recomendación", "Aplicar la dilución adecuada a la suciedad · siempre en sombra"]]),
    dict(id="destroyer", brand="Destroyer", type="Desengrasante industrial", name="Desengrasante Industrial Destroyer", cat="pesada", pres="1 L", ph="pH alcalino", price=85, tint="255,75,58",
         desc="Desengrasante concentrado para suciedad pesada en partes externas: motor, guardapolvos, rines y chasis. Trabaja sin tallar: se aplica y se activa con agua a presión.",
         specs=[["Presentación", "1 litro"], ["pH", "Alcalino"], ["Uso", "Motor, guardapolvos, rines y chasis"], ["Aplicación", "Sin tallar, activar la espuma con agua a presión"], ["Recomendación", "Trabajar siempre en sombra"]]),
    dict(id="aluclean", brand="Aluclean", type="Limpiador férrico", name="Aluclean Limpiador Férrico", cat="pesada", pres="1 L", ph="pH ácido", price=125, tint="163,91,255",
         desc="Limpiador férrico para la suciedad incrustada: óxido, polvo de balatas y suciedad pesada en rines y chasis.",
         specs=[["Presentación", "1 litro"], ["pH", "Ácido"], ["Uso", "Óxido, polvo de balatas, rines y chasis"], ["Precaución", "En sombra, máximo 5 minutos; nunca sobre plásticos ni superficies electrónicas"]]),
    dict(id="brochas", brand="Brochas de jabalí", type="Pack de 5 piezas", name="Brochas Pelo de Jabalí (pack de 5)", cat="herramientas", pres="5 pzas", ph="Detallado", price=135, tint="214,170,110",
         desc="Pack de 5 brochas de diferentes tamaños para detallado. Muy versátiles para la limpieza interna gracias a la suavidad de sus cerdas.",
         specs=[["Contenido", "5 piezas, diferentes tamaños"], ["Material", "Pelo de jabalí"], ["Uso", "Limpieza interna y detallado"]]),
    dict(id="microfibras", brand="Microfibras Pro", type="Pack de 12 piezas", name="Microfibras Profesionales (pack de 12)", cat="herramientas", pres="12 pzas", ph="Alta absorción", price=192, tint="255,120,40",
         desc="Pack de 12 microfibras de muy buena calidad: gran absorción al secar y muy buena adherencia para limpiar cristales.",
         specs=[["Contenido", "12 piezas"], ["Fortaleza", "Absorción al secar y agarre en cristales"], ["Uso", "Secado, cristales y detallado"]]),
    dict(id="guante-verde", brand="Guante de microfibra", type="Lavado de contacto", name="Guante de Microfibra para Lavado", cat="herramientas", pres="1 pza", ph="Anti-rayones", price=95, minQty=6, tint="182,255,46",
         desc="Guante de microfibra grande para el lavado de contacto. Súper suave para evitar rayones.",
         specs=[["Contenido", "1 pieza"], ["Uso", "Lavado de contacto"], ["Ventaja", "Súper suave, evita rayones"], ["Mayoreo", "$95 por pieza a partir de 6 piezas"]]),
]
FIT = {"ceramix-polish": "#000", "hydroshield": "#000", "brochas": "#fff", "microfibras": "#111"}
for p in P:
    p["fit"] = FIT.get(p["id"], "")
    p["catLabel"] = CATNAME[p["cat"]]
    p["img"] = f"img/{p['id']}.jpg"
    p.setdefault("base", None)
    p.setdefault("minQty", 0)

ARROW = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def roll(txt):
    t = esc(txt)
    return f'<span class="roll"><span class="roll__in"><span>{t}</span><span aria-hidden="true">{t}</span></span></span>'


def btn(variant, text, href, extra=""):
    cls = {"primary": "btn btn--primary", "ghost": "btn btn--ghost", "lg": "btn btn--primary btn--lg", "ghostlg": "btn btn--ghost btn--lg", "sm": "btn btn--primary btn--sm"}[variant]
    if href.startswith("wa:"):
        href = wa(href[3:])
    target = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
    return f'<a class="{cls}" href="{esc(href)}"{target} data-magnet {extra}><span class="btn__bg"></span><span class="btn__txt">{roll(text)}</span>{ARROW}</a>'


def wa(msg):
    from urllib.parse import quote
    return f"https://wa.me/{WA}?text={quote(msg)}"


def card(i, p):
    price = ""
    if SHOW_PRICES:
        if p["id"] == "canon-espuma":
            price = '<p class="pcard__price js-price"><small>Mayoreo 6+ pzas</small><b>$500</b><em>unidad $650</em></p>'
        elif p["id"] == "guante-verde":
            price = '<p class="pcard__price js-price"><small>Mayoreo 6+ pzas</small><b>$95</b></p>'
        elif p["id"] == "aromatizante":
            price = '<p class="pcard__price js-price"><small>Caja de 12 pzas</small><b>$55</b></p>'
        else:
            price = f'<p class="pcard__price js-price"><small>Mayoreo</small><b>${p["price"]}</b></p>'
    return (
        f'<li class="pcard" data-reveal{" data-fit" if p["fit"] else ""} data-id="{p["id"]}" data-cat="{p["cat"]}" data-name="{esc((p["brand"] + " " + p["type"] + " " + p["name"]).lower())}" style="--tint:{p["tint"]}{";--mbg:" + p["fit"] if p["fit"] else ""}">'
        f'<button class="pcard__open" type="button" data-open="{p["id"]}" aria-label="Ver ficha: {esc(p["name"])}">'
        f'<span class="pcard__media"><img src="{p["img"]}" alt="{esc(p["name"])} de Proluxcar, {esc(p["pres"])}" loading="lazy" decoding="async" width="800" height="1000"></span>'
        f'<span class="pcard__glare" aria-hidden="true"></span>'
        f'<span class="pcard__cat mono">{esc(p["catLabel"])}</span><span class="pcard__view mono" aria-hidden="true">Ver ficha</span></button>'
        f'<div class="pcard__body"><p class="pcard__type mono">{esc(p["type"])}</p><h3 class="pcard__name">{esc(p["brand"])}</h3>'
        f'<p class="pcard__meta mono"><span>{esc(p["pres"])}</span><span>{esc(p["ph"])}</span></p>'
        f'<div class="pcard__foot">{price}<button class="pcard__add" type="button" data-add="{p["id"]}" aria-label="Agregar {esc(p["name"])} a mi pedido"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Pedido</span></button></div></div></li>'
    )


def main():
    tpl = (SRC / "template.html").read_text(encoding="utf-8")
    catalog = "\n".join(card(i, p) for i, p in enumerate(P))
    chips = ['<button class="fchip is-on" type="button" data-filter="all" aria-pressed="true">Todo <i>20</i></button>']
    for key, label in CATS:
        n = sum(1 for p in P if p["cat"] == key)
        chips.append(f'<button class="fchip" type="button" data-filter="{key}" aria-pressed="false">{esc(label)} <i>{n}</i></button>')
    data = {"wa": WA, "prices": SHOW_PRICES, "products": P}
    tpl = tpl.replace("{{CATALOG}}", catalog).replace("{{CHIPS}}", "\n".join(chips))
    tpl = tpl.replace("{{DATA}}", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    tpl = tpl.replace("{{PRICES}}", "on" if SHOW_PRICES else "off")
    tpl = re.sub(r"\[\[btn:(\w+)\|([^|\]]*)\|([^|\]]*)\|?([^\]]*)\]\]", lambda m: btn(m.group(1), m.group(2), m.group(3), m.group(4)), tpl)
    tpl = re.sub(r"\[\[wa:([^\]]*)\]\]", lambda m: wa(m.group(1)), tpl)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(tpl, encoding="utf-8")
    print("index.html", len(tpl) // 1024, "KB ->", OUT)


if __name__ == "__main__":
    main()
