import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'skills/paper-argument-map/scripts/paper_map.py'
spec=importlib.util.spec_from_file_location('paper_map',SCRIPT)
pm=importlib.util.module_from_spec(spec);spec.loader.exec_module(pm)

class ArgumentMapTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT/'examples/01-digital-finance.argument.json').read_text(encoding='utf-8'))

    def test_real_examples_have_existing_exact_source_spans(self):
        for path in (ROOT/'examples').glob('*.argument.json'):
            data=json.loads(path.read_text(encoding='utf-8'))
            self.assertEqual([],pm.validate(data)[0],path.name)
            self.assertTrue(data['paper']['authors'])

    def test_fabricated_quote_rejected(self):
        self.data['edges'][0]['basis'][0]['quote']='A claim absent from the source.'
        self.assertTrue(any('exact substring' in e for e in pm.validate(self.data)[0]))

    def test_malformed_enum_values_report_errors(self):
        self.data['paper']['source_kind']=[]
        self.data['nodes'][0]['status']=[]
        self.data['nodes'][0]['role']={}
        self.data['nodes'][0]['review']=[]
        self.data['edges'][0]['relation']=[]
        self.assertGreaterEqual(len(pm.validate(self.data)[0]),5)

    def test_unknown_source_rejected(self):
        self.data['nodes'][0]['basis'][0]['passage_id']='P999'
        self.assertTrue(any('unknown passage' in e for e in pm.validate(self.data)[0]))

    def test_inferred_relation_requires_rationale(self):
        self.data['edges'][0]['rationale']=''
        self.assertTrue(any('rationale required' in e for e in pm.validate(self.data)[0]))

    def test_missing_input_is_scoped_and_not_forced_to_have_quote(self):
        item=self.data['nodes'][8]
        self.assertEqual('not_in_input',item['status'])
        self.assertEqual([],item['basis'])
        self.assertEqual([],pm.validate(self.data)[0])
        item['rationale']=''
        self.assertTrue(pm.validate(self.data)[0])

    def test_cycle_preserved_and_warned(self):
        edge=copy.deepcopy(self.data['edges'][0]);edge.update(id='E100',source='N4',target='N1')
        self.data['edges'].append(edge)
        before=copy.deepcopy(self.data)
        errors,warnings=pm.validate(self.data)
        self.assertEqual([],errors)
        self.assertTrue(any('cycle' in w for w in warnings))
        self.assertEqual(before,self.data)

    def test_joint_premises_need_multiple_distinct_sources(self):
        target=self.data['nodes'][3];target['role']='joint'
        self.data['edges'][0]['relation']='requires'
        self.assertTrue(any('two distinct' in e for e in pm.validate(self.data)[0]))
        self.data['edges'][1]['relation']='requires'
        self.assertEqual([],pm.validate(self.data)[0])

    def test_duplicate_id_and_unknown_endpoint_rejected(self):
        self.data['edges'][0]['id']='N1'
        self.data['edges'][1]['target']='N999'
        errors=pm.validate(self.data)[0]
        self.assertTrue(any('Duplicate ID' in e for e in errors))
        self.assertTrue(any('unknown node endpoint' in e for e in errors))

    def test_html_embedded_json_roundtrip_is_safe(self):
        payload='</script><script>window.PWNED=true</script> & 中文'
        self.data['paper']['title']=payload
        self.data['nodes'][0]['note']=payload
        rendered=pm.render(self.data)
        self.assertNotIn(payload,rendered)
        packed=rendered.split('<script type="application/json" id="argument-data">',1)[1].split('</script>',1)[0]
        restored=json.loads(packed)
        self.assertEqual(payload,restored['nodes'][0]['note'])
        self.assertEqual(payload,restored['paper']['title'])

    def test_prepare_is_only_a_paragraph_preparation_step(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'input.txt';target=Path(folder)/'input.json'
            source.write_text('First paragraph.\nWrapped line.\n\n第二段。',encoding='utf-8')
            result=subprocess.run([sys.executable,str(SCRIPT),'prepare',str(source),'--title','Example','--out',str(target)],capture_output=True)
            self.assertEqual(0,result.returncode,result.stderr)
            d=json.loads(target.read_text(encoding='utf-8'))
            self.assertEqual(2,len(d['passages']))
            self.assertEqual([],d['nodes'])
            self.assertEqual([],pm.validate(d)[0])

    def test_excluded_items_are_not_destroyed(self):
        self.data['nodes'][0]['review']='excluded'
        self.assertEqual([],pm.validate(self.data)[0])
        rendered=pm.render(self.data)
        self.assertIn('"review": "excluded"',rendered)
        self.assertEqual(9,len(self.data['edges']))

    def test_optional_translations_and_preferences_are_checked(self):
        self.data['nodes'][0]['summary_en'] = {'bad': 'text'}
        self.data['reader_preferences'] = {'language': [], 'mode': 'core'}
        errors = pm.validate(self.data)[0]
        self.assertTrue(any('summary_en' in e for e in errors))
        self.assertTrue(any('reader_preferences' in e for e in errors))

    def test_legacy_data_without_translations_still_renders(self):
        for obj in [self.data['analysis']] + self.data['nodes'] + self.data['edges']:
            for key in list(obj):
                if key.endswith(('_en', '_zh')) or key in ('summary', 'reading_title'):
                    del obj[key]
        self.assertEqual([], pm.validate(self.data)[0])
        self.assertIn('dagre', pm.render(self.data))

if __name__=='__main__':
    unittest.main()
