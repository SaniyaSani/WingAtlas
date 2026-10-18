import json,sys
r=json.load(open(sys.argv[1]))
n=len(r);t1=sum(x['top'][0][0]==x['family'] for x in r);t3=sum(any(f==x['family'] for f,_ in x['top']) for x in r);nm=sum(x['noMatch'] for x in r)
wrong_conf=sum((not x['noMatch']) and x['top'][0][0]!=x['family'] for x in r)
print(sys.argv[1],'n',n,'top1',t1,'top3',t3,'no-match',nm,'confident-wrong',wrong_conf)
