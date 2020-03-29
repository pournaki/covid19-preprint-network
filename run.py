#!/usr/bin/env python

"""Generates interactive interface for COVID-19 semantic similarity
preprint network."""

__author__    = "Armin Pournaki"
__copyright__ = "Copyright 2020, Armin Pournaki"
__credits__   = ["Alexander Dejaco", "Felix Gaisbauer", "Sven Banisch", "Eckehard Olbrich"]
__license__   = "GPLv3"
__version__   = "0.1"
__email__     = "pournaki@mis.mpg.de"

import os
import ast
import json
import spacy
import requests
import urllib.request
from tqdm import tqdm
from habanero import Crossref
from datetime import datetime
from collections import Counter

# define DIRS
DATADIR = "./data/"
PLOTDIR = "./plots/"
SITEDIR = "./site/"
LOGSDIR = "./logs/"
SITESUBDIR = "./site/data/"

DIRS = [DATADIR, PLOTDIR, SITEDIR, LOGSDIR, SITESUBDIR]

for DIR in DIRS:
    if not os.path.exists(DIR):
        os.makedirs(DIR)

# download data
url = 'https://connect.medrxiv.org/relate/collection_json.php?grp=181'
response = urllib.request.urlopen(url)
data = response.read()       # a `bytes` object
file = data.decode('utf-8')  # a `str`;
jsonl = ast.literal_eval(file)['rels']
print(f"There are now {len(jsonl)} articles on medRxiv/bioRxiv.")

# make jsonl
articles = []
for el in jsonl:
    authors = ""
    for author in jsonl[0]['rel_authors']:
        authors += author['author_name']
        authors += ", "
    authors = authors[:-2]
    DOI = el['rel_doi'].replace('\\', '')
    abstract = el['rel_abs'].replace("\\", "")
    art = {'doi': DOI,
           'server': el['rel_site'],
           'date': el['rel_date'],
           'title': el['rel_title'],
           'authors': authors,
           'abstract': abstract}
    articles.append(art)

# check if you already have subfields
CATS = "CATS.json"

catfile = DATADIR + CATS

if CATS in os.listdir(DATADIR):
    with open(catfile, 'r', encoding='utf-8') as f:
        cats = json.load(f)
    for art in articles:
        try:
            art['subfield'] = cats[art['doi']]
        except KeyError:
            pass

# get the subfield data from crossref for the files you don't have yet
# (hopefully this will not be needed soon)

cr = Crossref()

for art in tqdm(articles):
    if 'subfield' in art.keys():
        if art['subfield'] == 'not_found':
            try:
                md = cr.works(ids=art['doi'])
                subfield = md['message']['group-title']
                art['subfield'] = subfield
            except requests.exceptions.HTTPError:
                art['subfield'] = 'not_found'
    else:
        try:
            md = cr.works(ids=art['doi'])
            subfield = md['message']['group-title']
            art['subfield'] = subfield
        except requests.exceptions.HTTPError:
            art['subfield'] = 'not_found'

# save cats with the newly acquired categories
cats = {}
for art in articles:
    cats[art['doi']] = art['subfield']
with open(catfile, 'w', encoding='utf-8') as f:
    json.dump(cats, f)

# save articles with metadata
ARTICLES = "ARTICLES.json"
with open(DATADIR + ARTICLES, 'w', encoding='utf-8') as f:
    for entry in articles:
        json.dump(entry, f)
        f.write('\n')


# --- NETWORK CREATION ---

nlp = spacy.load('en_core_web_sm')
relevantPOS = ['PNOUN','NOUN', 'ADJ', 'VERB']
ignoreLEM = ['sars-cov-2',
             'disease',
             'outbreak',
             'infection',
             'epidemic',
             'patient',
             'case',
             'covid',
             'coronavirus',
             'covid-19',
             'illness',
             'study',
             'characteristic',
             'coronaviruse',
             'cov-2',
             'analysis',
             'cov',
             'cov-1',
             'number',
             'datum',
             'result']

data = articles
for doc in tqdm(data):
    doc.update({'nlp_doc': nlp(doc['abstract'])})

lemmata = []
for doc in data:
    doc_lemmata = []
    for token in doc['nlp_doc']:
        if not token.is_punct and \
        not token.is_stop and \
        token.pos_ in relevantPOS and \
        token.lemma_.lower() not in ignoreLEM:
            lemmata.append(str(token.lemma_).lower())
            doc_lemmata.append(token.lemma_.lower())
    doc.update({'lemmata': doc_lemmata})

# create dicts with count of metadata entries in corpus
lemmacounts = dict(Counter(lemmata).most_common())

# set threshold of common lemmata for link creation
t_links = 16

# every document is a node
nodes = []
for idx, doc in enumerate(data):
    nodedict = {'id': idx,
                'title': doc['title'],
                'lemmata': doc['lemmata'],
                'subfield': doc['subfield']}
    nodes.append(nodedict)

# draw a link between two documents for every lemma they share
links = []
for node1 in nodes:
    for node2 in nodes:
        if node2['id'] > node1['id']:
            lemmata1 = node1['lemmata']
            lemmata2 = node2['lemmata']
            overlap = set(lemmata1) & set(lemmata2)
            if len(overlap) > t_links:
                linkdict = {'source': node1['id'],
                            'target': node2['id']}
                links.append(linkdict)

# remove the lemmata, they are not needed anymore for the visualization
for node in nodes:
    del node['lemmata']

fields = []
for art in articles:
    fields.append(art['subfield'])
fieldcounts = dict(Counter(fields).most_common())
del fieldcounts['not_found']

# some colors from https://sashat.me/2017/01/11/list-of-20-simple-distinct-colors/
clist = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075']

colordict = {}
for idx,field in enumerate(fieldcounts):
    try:
        fieldcol = clist[idx]
    except IndexError:
        fieldcol = clist[18]
    colordict[field] = fieldcol
colordict['not_found'] = '#000075'

fullstr = ""
for field in list(colordict.keys())[:18]:
    dec1 = f"""<li style="color: {colordict[field]}">"""
    dec2 = f"""<a class="fieldlinks" href="javascript:void(0)" """
    dec3 = f"""onclick="highfield('{field}')">"""
    dec4 = f"""{field}</a></li>"""
    fullstr += dec1+dec2+dec3+dec4
    fullstr += "\n"
otherstr = """<li style="color: #000075">Other</li>"""
fullstr += otherstr

# create d3graph
d3graph = {'graph': {'date': str(datetime.now())[:16]+" UTC",
                     'N_nodes': len(nodes),
                     'N_links': len(links),
                     't_links': t_links,
                     'colordict': colordict,
                     'legend': fullstr},
           'nodes': nodes,
           'links': links}

print(f"There are {len(links)} links in the co-occurence network.")

# save graph and metadata for site
with open(SITESUBDIR + "graph.json", 'w', encoding='utf-8') as f:
    json.dump(d3graph, f, ensure_ascii=False)

graph_metadata = {}
for idx, article in enumerate(articles):
    graph_metadata[idx] = {
        'doi': article['doi'],
        'server': article['server'],
        'date': article['date'],
        'title': article['title'],
        'subfield': article['subfield'],
        'authors': article['authors'],
        'abstract': article['abstract']
    }
with open(SITESUBDIR + "graph_metadata.json", 'w', encoding='utf-8') as f:
    json.dump(graph_metadata, f, ensure_ascii=False)

# plot stats
import plotly
import cufflinks
import json
import pandas as pd

# rearrange colordict
colordict['Other'] = colordict['not_found']
del colordict['not_found']
artlist = []
with open(DATADIR + "ARTICLES.json", "r", encoding="utf-8") as f:
    for line in f:
        lin = f.readline()
        artlist.append(json.loads(line))

# remove the colors we don't need
for art in artlist:
    if art['subfield'] in colordict.keys():
        pass
    else:
        art['subfield'] = 'Other'

df = pd.DataFrame(artlist)


def plot_cattimeline(df, colordict):
    figure = df.groupby('date')["subfield"].value_counts().unstack().fillna(0).iplot(
             kind='scatter', asFigure=True)
    # adjust the colors
    for i in figure['data']:
        i['line']['color'] = colordict[i['name']]
    figure['layout']['title'].update({'text': 'Timeline of COVID-19 preprints'})
    figure['layout']['xaxis'].update({'title': f'time'})
    figure['layout']['yaxis'].update({'title': 'number of articles per category'})
    return figure


def plot_fulltimeline(df):
    figure = df.groupby('date')["doi"].nunique().iplot(
        kind='line', asFigure=True)
    figure['layout']['title'].update({'text': 'Timeline of COVID-19 preprints'})
    figure['layout']['xaxis'].update({'title': f'time'})
    figure['layout']['yaxis'].update({'title': 'total number of articles'})
    figure['data'][0]['line'].update({'color': 'rgb(0,0,0)'})
    return figure


fig1 = plot_fulltimeline(df)
fig2 = plot_cattimeline(df, colordict)
plotly.offline.plot(fig1, filename=PLOTDIR + 'full.html', auto_open=False)
plotly.offline.plot(fig2, filename=PLOTDIR + 'cats.html', auto_open=False)
