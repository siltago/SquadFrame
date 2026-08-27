/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:jest.fn(async()=>null),setItem:jest.fn(async()=>undefined),removeItem:jest.fn(async()=>undefined),clear:jest.fn(async()=>undefined)}));
jest.mock('@react-native-community/netinfo',()=>({addEventListener:jest.fn(()=>jest.fn())}));
jest.mock('react-native-config',()=>({SQUADMEASURE_SUPABASE_URL:'https://example.supabase.co',SQUADMEASURE_SUPABASE_ANON_KEY:'test-key',SQUADMEASURE_API_BASE_URL:'https://api.example.test'}));
jest.mock('react-native-keychain',()=>({ACCESSIBLE:{WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device'},getGenericPassword:jest.fn(async()=>false),setGenericPassword:jest.fn(async()=>true),resetGenericPassword:jest.fn(async()=>true)}));
jest.mock('uuid',()=>({v4:jest.fn(()=>'00000000-0000-4000-8000-000000000001')}));
jest.mock('lucide-react-native',()=>new Proxy({},{get:()=>()=>null}));
jest.mock('react-native-image-picker',()=>({launchCamera:jest.fn(async()=>({didCancel:true})),launchImageLibrary:jest.fn(async()=>({didCancel:true}))}));
jest.mock('react-native-fs',()=>({DocumentDirectoryPath:'/documents',mkdir:jest.fn(async()=>undefined),copyFile:jest.fn(async()=>undefined)}));
