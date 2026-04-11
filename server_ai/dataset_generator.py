import csv
import random
import os

# Configuration
OUTPUT_FILE = 'dataset.csv'
ENTRIES_PER_LANGUAGE = 10000
LANGUAGES = ['english', 'tagalog', 'bisaya']

BARANGAYS = [
    "Casisang", "Sumpong", "Poblacion", "Aglayan", "Bangcud", "Busdi", "Cabangahan", 
    "Caburacanan", "Can-ayan", "Capitan Angel", "Indalasa", "Kibalabag", "Kulaman", 
    "Laguitas", "Linabo", "Magsaysay", "Maligaya", "Managok", "Manalog", "Mapayag", 
    "Mapulo", "Miglamin", "San Jose", "Silae", "Sinanglanan", "Sinalac", "St. Peter", 
    "Zamboanguita", "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5",
    "Barangay 6", "Barangay 7", "Barangay 8", "Barangay 9", "Barangay 10", "Barangay 11"
]

INTENTS = {
    "report_leak": {
        "english": ["leak", "water gushing", "broken pipe", "burst pipe", "pipe leak", "leakage", "water waste"],
        "tagalog": ["may leak", "tumatagas", "sira ang tubo", "nagbubuhos ang tubig", "may tagas", "butas na tubo"],
        "bisaya": ["naay leak", "nagbuswak", "buslot ang tubo", "nag-agas ang tubig", "tulo sa linya", "guba ang tubo"]
    },
    "check_bill": {
        "english": ["check my bill", "how much is my bill", "view balance", "water bill amount", "payment due"],
        "tagalog": ["magkano bill ko", "check ng bill", "bayarin sa tubig", "balance ko", "magkano babayaran"],
        "bisaya": ["pila akong bill", "tan-aw sa balance", "bayad sa tubig", "pila akong utang", "pila ang bayranon"]
    },
    "no_supply": {
        "english": ["no water", "interruption", "dry tap", "waterless", "why no water", "water cut"],
        "tagalog": ["walang tubig", "nawalan ng tubig", "bakit walang tubig", "putol ang tubig", "tuyo ang gripo"],
        "bisaya": ["way tubig", "nawad-an mig tubig", "nganong way tubig", "putol ang tubig", "uga ang gripo"]
    },
    "broken_meter": {
        "english": ["broken meter", "defective water meter", "meter stolen", "meter issues", "stuck meter"],
        "tagalog": ["sirang metro", "nanakaw na metro", "guba ang metro", "problem sa metro", "ayaw umikot ng metro"],
        "bisaya": ["guba ang metro", "gikawat ang metro", "dili mutuyok ang metro", "metro sa tubig guba", "metro issues"]
    },
    "low_pressure": {
        "english": ["low pressure", "weak flow", "hardly any water", "poor pressure", "weak water"],
        "tagalog": ["mahinang tulo", "mababa ang pressure", "walang pressure", "mahina ang daloy", "hindi makaakyat sa 2nd floor"],
        "bisaya": ["hinay ang agas", "way pressure", "hinay kaayo ang tubig", "dili kasaka sa taas", "pait ang tubig"]
    },
    "contaminated_water": {
        "english": ["dirty water", "brown water", "smelly water", "muddy water", "unclear water", "contaminated"],
        "tagalog": ["maduming tubig", "kulay brown", "mabaho ang tubig", "maputik", "hindi malinis ang tubig"],
        "bisaya": ["lubog ang tubig", "pula ang tubig", "nanimaho", "lapok ang tubig", "hugaw ang tubig"]
    },
    "bill_dispute": {
        "english": ["wrong bill", "high bill", "overcharged", "incorrect reading", "complaint about bill"],
        "tagalog": ["maling bill", "bakit ang laki ng bill", "reklamo sa bill", "maling reading", "overcharging"],
        "bisaya": ["sayop ang bill", "nganong dako akong bill", "reklamo sa bill", "sayop ang reading", "overcharge"]
    },
    "payment_inquiry": {
        "english": ["how to pay", "where to pay", "gcash payment", "online payment", "payment centers"],
        "tagalog": ["saan pwedeng magbayad", "paano magbayad", "tanggap ba ng gcash", "bayad sa online", "payment options"],
        "bisaya": ["asa pwede mubayad", "unsaon pagbayad", "dawaton ba ang gcash", "bayad sa online", "asa ang opisina"]
    },
    "request_maintenance": {
        "english": ["request maintenance", "new connection", "repair line", "apply for water", "check connection"],
        "tagalog": ["pa-check ng linya", "bagong connection", "magpapakabit ng tubig", "maintenance request", "pa-repair"],
        "bisaya": ["pa-check sa linya", "bag-ong connection", "magpataod ug tubig", "maintenance request", "pa-ayo"]
    },
    "emergency_shutoff": {
        "english": ["emergency shutoff", "stop water", "close valve", "flood", "massive leak emergency"],
        "tagalog": ["emergency shutoff", "paki-patay ang tubig", "isara ang valve", "baha sa loob", "emergency stop"],
        "bisaya": ["emergency shutoff", "paderahan ang tubig", "isirado ang valve", "baha na sa balay", "emergency stop"]
    },
    "reach_admin": {
        "english": ["talk to admin", "message support", "customer service", "speak with someone", "help please"],
        "tagalog": ["makausap ang admin", "message sa support", "tulong po", "pakausap sa staff", "assistance please"],
        "bisaya": ["makaistorya sa admin", "message sa support", "tabang palihug", "pakistorya sa staff", "assistance please"]
    },
    "greeting": {
        "english": ["hi", "hello", "good morning", "good day", "hey", "aqua help"],
        "tagalog": ["hi", "hello", "magandang umaga", "kumusta", "po", "magandang araw"],
        "bisaya": ["hi", "hello", "maayong buntag", "kumusta", "sir", "maayong adlaw"]
    },
    "unrelated_internet": {
        "english": ["my internet is slow", "no wifi", "slow connection", "no signal", "globe is down", "smart is down", "lagging internet", "loss of connection"],
        "tagalog": ["mabagal ang internet", "walang signal", "walang wifi", "sira ang globe", "hinahina ng connection", "nawala ang internet"],
        "bisaya": ["hinay ang internet", "way signal", "way wifi", "guba ang globe", "hinay connection", "nawala ang internet"]
    },
    "unrelated_electricity": {
        "english": ["power outage", "no electricity", "brownout", "fibeco issue", "when will power return", "no power"],
        "tagalog": ["walang kuryente", "brownout dito", "kailan babalik ang kuryente", "sira ang poste ng kuryente", "patay sindi kuryente"],
        "bisaya": ["way kuryente", "brownout dire", "kanus-a mubalik ang kuryente", "guba ang poste", "putol kuryente"]
    },
    "unrelated_garbage": {
        "english": ["garbage collection", "trash not picked up", "where to throw garbage", "smelly garbage", "waste management"],
        "tagalog": ["hindi nakolekta ang basura", "saan itatapon ang basura", "mabaho ang basura", "collection ng basura"],
        "bisaya": ["wala gikuha ang basura", "aha ilabay ang basura", "baho ang basura", "pagkuha sa basura"]
    },
    "unrelated_road": {
        "english": ["road repair", "potholes", "broken road", "street lights not working", "traffic issue", "heavy traffic"],
        "tagalog": ["sira ang kalsada", "may lubak", "hindi gumagana ang street light", "traffic jam", "paayos ng kalsada"],
        "bisaya": ["guba ang kalsada", "dako nga libaong", "wala nagsiga ang street light", "traffic kaayo", "paayo sa kalsada"]
    },
    "unrelated_general": {
        "english": ["where is the hospital", "pizza delivery", "how to apply for a loan", "where to buy food", "i want to eat", "stray dogs", "noise complaint"],
        "tagalog": ["saan ang ospital", "peso loan", "gusto ko kumain", "may asong pagala-gala", "masyadong maingay ang kapitbahay", "saan makakabili ng pagkain"],
        "bisaya": ["aha ang ospital", "aha makapalit ug pagkaon", "gusto ko mokaon", "naay iro nga libod suroy", "saba kaayo ang silingan"]
    }
}

EMOTIONAL_MARKERS = {
    "english": ["Please", "Urgent", "Help!", "Asap", "Now", "Unacceptable", "Disappointed"],
    "tagalog": ["Paki", "Agad", "Tulong", "Ngayon na", "Nakakainis", "Grabe", "Please lang"],
    "bisaya": ["Palihug", "Dali", "Tabang", "Karon dayon", "Nakakainit sa ulo", "Yawa", "Intawon"]
}

def generate_phrase(language, intent):
    templates = INTENTS[intent][language]
    base = random.choice(templates)
    
    # Randomly add location
    if random.random() > 0.4:
        loc = random.choice(BARANGAYS)
        if language == 'english':
            base = f"{base} in {loc}"
        elif language == 'tagalog':
            base = f"{base} sa {loc}"
        else: # bisaya
            base = f"{base} sa {loc}"
            
    # Randomly add emotional marker
    if random.random() > 0.5:
        marker = random.choice(EMOTIONAL_MARKERS[language])
        if random.random() > 0.5:
            base = f"{marker} {base}"
        else:
            base = f"{base} {marker}"
            
    # Randomly add punctuation
    punc = random.choice(['.', '!', '!!!', '?', '...', ''])
    base += punc
    
    return base.lower()

def main():
    print(f"Generating {ENTRIES_PER_LANGUAGE * len(LANGUAGES)} entries...")
    dataset = []
    
    for lang in LANGUAGES:
        for _ in range(ENTRIES_PER_LANGUAGE):
            intent = random.choice(list(INTENTS.keys()))
            phrase = generate_phrase(lang, intent)
            dataset.append({'text': phrase, 'intent': intent})
            
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['text', 'intent'])
        writer.writeheader()
        writer.writerows(dataset)
        
    print(f"Dataset saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
