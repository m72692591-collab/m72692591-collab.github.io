import importlib.util
from pathlib import Path
import tempfile, unittest
spec=importlib.util.spec_from_file_location('package_maestro',Path(__file__).parents[1]/'tools/package_maestro.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class PackagingTests(unittest.TestCase):
    def test_invalid_origins(self):
        for value in ['http://example.test','https://u:p@example.test','https://example.test/path','https://example.test?q=x','https://example.test#x','https://example.test:8443']:
            with self.subTest(value=value), self.assertRaises(ValueError):m.origin(value)
    def test_allowlist_and_injection(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); source=root/'maestro';source.mkdir()
            (source/'server').mkdir();(source/'server'/'leak.php').write_text('SECRET')
            (source/'.env').write_text('SECRET')
            (source/'guide.md').write_text('PRIVATE')
            (source/'index.html').write_text('<meta name="maestro-lead-endpoint" content="">')
            (source/'app.js').write_text('console.log("ok")')
            (source/'symbol.svg').write_text('<svg/>')
            (source/'linked.txt').symlink_to(source/'.env')
            target=root/'output'; result=m.package(root,target,'https://Maestro.example/')
            self.assertEqual(result['origin'],'https://maestro.example')
            self.assertEqual(set(result['files']),{'index.html','app.js','symbol.svg'})
            self.assertIn('https://maestro.example/api/leads',(target/'index.html').read_text())
            with self.assertRaises(FileExistsError):m.package(root,target,'https://maestro.example')
    def test_missing_activation_marker_blocks_package(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'maestro').mkdir();(root/'maestro/index.html').write_text('<html/>')
            with self.assertRaises(ValueError):m.package(root,root/'out','https://maestro.example')

if __name__=='__main__':unittest.main()
