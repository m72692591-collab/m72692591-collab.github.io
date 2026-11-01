import asyncio
import unittest
from uuid import uuid4
from integrations.site_channel import parse_message, public_response, dispatch, InvalidRequest

class SiteChannelTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.sid=str(uuid4());self.rid=str(uuid4())
    def test_session_namespace(self):
        m=parse_message({'request_id':self.rid,'text':' Нужен бот '},verified_session_id=self.sid)
        self.assertEqual(m.session_key,'web:'+self.sid)
        self.assertEqual(m.tenant,'maestro')
        self.assertEqual(m.text,'Нужен бот')
    def test_client_cannot_set_tenant_or_tools(self):
        with self.assertRaises(InvalidRequest):
            parse_message({'request_id':self.rid,'text':'Тест','tenant':'other'},verified_session_id=self.sid)
    def test_invalid_session(self):
        with self.assertRaises(InvalidRequest):
            parse_message({'request_id':self.rid,'text':'Тест'},verified_session_id='other-chat')
    def test_no_silent_truncation(self):
        with self.assertRaises(InvalidRequest):
            parse_message({'request_id':self.rid,'text':'я'*4001},verified_session_id=self.sid)
    def test_no_external_actions_or_secrets(self):
        result=public_response({'text':'Ответ','token':'SECRET','actions':[
            {'type':'navigate','page':'https://evil.example'},
            {'type':'delete','page':'index.html#lead'},
            {'type':'navigate','page':'maestro-lab.html'}]},self.rid)
        self.assertNotIn('token',result)
        self.assertEqual(result['actions'],[{'type':'navigate','page':'maestro-lab.html'}])
    async def test_existing_engine_is_called(self):
        async def engine(message):return {'text':'Ответ по теме: '+message.text}
        result=await dispatch({'request_id':self.rid,'text':'CRM'},verified_session_id=self.sid,engine=engine)
        self.assertTrue(result['ok']);self.assertIn('CRM',result['text'])
    async def test_timeout_has_no_fake_receipt(self):
        async def engine(message):await asyncio.sleep(.1);return {'text':'Ответ'}
        result=await dispatch({'request_id':self.rid,'text':'Тест'},verified_session_id=self.sid,engine=engine,timeout_seconds=.001)
        self.assertFalse(result['ok']);self.assertNotIn('received',result)

if __name__=='__main__':unittest.main()
