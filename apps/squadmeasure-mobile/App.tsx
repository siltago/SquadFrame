import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ClipboardCheck from 'lucide-react-native/icons/clipboard-check';
import Cloud from 'lucide-react-native/icons/cloud';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Copy from 'lucide-react-native/icons/copy';
import DoorOpen from 'lucide-react-native/icons/door-open';
import Edit3 from 'lucide-react-native/icons/square-pen';
import Eye from 'lucide-react-native/icons/eye';
import FileWarning from 'lucide-react-native/icons/triangle-alert';
import Home from 'lucide-react-native/icons/house';
import LogIn from 'lucide-react-native/icons/log-in';
import LogOut from 'lucide-react-native/icons/log-out';
import MapPin from 'lucide-react-native/icons/map-pin';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Ruler from 'lucide-react-native/icons/ruler';
import Send from 'lucide-react-native/icons/send';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Wifi from 'lucide-react-native/icons/wifi';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';
import Building2 from 'lucide-react-native/icons/building-2';
import Briefcase from 'lucide-react-native/icons/briefcase-business';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import User from 'lucide-react-native/icons/user';
import Camera from 'lucide-react-native/icons/camera';
import Images from 'lucide-react-native/icons/images';
import { Circle, Line, Svg, Text as SvgText } from 'react-native-svg';
import { v4 as uuid } from 'uuid';
import { useMeasureStore } from './src/store';
import {
  Element,
  Environment,
  FieldPhoto,
  Measurement,
  Observation,
  SyncState,
} from './src/types';
import {
  AppButton,
  Badge,
  Card,
  FieldInput,
  Loading,
  ProgressBar,
} from './src/ui';
import { colors, radius } from './src/theme';
import { acquirePhoto } from './src/photos';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <Root />
    </SafeAreaProvider>
  );
}
function Root() {
  const s = useMeasureStore();
  const [sync, setSync] = useState(false);
  useEffect(() => {
    useMeasureStore.getState().initialise();
    return NetInfo.addEventListener(n =>
      useMeasureStore
        .getState()
        .setOnline(Boolean(n.isConnected && n.isInternetReachable !== false)),
    );
  }, []);
  if (!s.ready) return <Loading />;
  if (!s.session) return <Login />;
  if (sync) return <SyncScreen close={() => setSync(false)} />;
  if (s.selectedVisitId) return <Field openSync={() => setSync(true)} />;
  return <Visits openSync={() => setSync(true)} />;
}
function ErrorBanner() {
  const { error, clearError } = useMeasureStore();
  return error ? (
    <Pressable onPress={clearError} style={styles.error}>
      <FileWarning size={20} color={colors.danger} />
      <View style={styles.flex}>
        <Text style={styles.errorTitle}>Não foi possível concluir</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
      <X size={17} color={colors.danger} />
    </Pressable>
  ) : null;
}
function Login() {
  const s = useMeasureStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <SafeAreaView style={styles.loginSafe}>
      <View style={styles.loginHero}>
        <View style={styles.logo}>
          <Ruler size={30} color={colors.white} />
        </View>
        <Text style={styles.loginBrand}>SquadMeasure</Text>
        <Text style={styles.loginSubtitle}>
          Medições de obras, mesmo sem conexão.
        </Text>
      </View>
      <View style={styles.loginPanel}>
        <Text style={styles.eyebrow}>ACESSO AO SQUADSYSTEM</Text>
        <Text style={styles.loginTitle}>Entre na sua conta</Text>
        <Text style={styles.bodyMuted}>
          Use as mesmas credenciais do SquadSystem.
        </Text>
        {s.configErrors.length > 0 && (
          <View style={styles.warning}>
            <FileWarning size={18} color={colors.warning} />
            <Text style={styles.warningText}>
              Configuração ausente: {s.configErrors.join(', ')}
            </Text>
          </View>
        )}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>E-mail</Text>
          <FieldInput
            placeholder="nome@empresa.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Senha</Text>
          <FieldInput
            placeholder="Sua senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <ErrorBanner />
        <AppButton
          full
          icon={LogIn}
          label={s.busy ? 'Entrando…' : 'Entrar'}
          disabled={s.busy || !email || !password || s.configErrors.length > 0}
          onPress={() => s.login(email, password)}
        />
        <Text style={styles.loginFoot}>SquadMeasure · Android e iOS</Text>
      </View>
    </SafeAreaView>
  );
}
function Header({
  title,
  subtitle,
  back,
  openSync,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
  openSync: () => void;
}) {
  const s = useMeasureStore();
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {back ? (
          <Pressable style={styles.iconButtonDark} onPress={back}>
            <ArrowLeft size={22} color={colors.white} />
          </Pressable>
        ) : (
          <View style={styles.headerMark}>
            <Ruler size={22} color={colors.white} />
          </View>
        )}
        <View style={styles.headerTitle}>
          <Text numberOfLines={1} style={styles.headerText}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {subtitle ?? 'SquadMeasure'}
          </Text>
        </View>
        <Pressable
          style={styles.syncButton}
          onPress={openSync}
          accessibilityLabel="Sincronização"
        >
          {s.online ? (
            <Wifi size={18} color={colors.white} />
          ) : (
            <WifiOff size={18} color={colors.white} />
          )}
          {s.cache.mutations.length > 0 ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{s.cache.mutations.length}</Text>
            </View>
          ) : null}
        </Pressable>
        <ProfileTrigger onPress={() => setProfileOpen(true)} />
        <ProfileCard
          visible={profileOpen}
          close={() => setProfileOpen(false)}
          openSync={() => {
            setProfileOpen(false);
            openSync();
          }}
        />
      </View>
    </View>
  );
}

function initials(name?: string) {
  return (name ?? 'Usuário')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
function ProfileAvatar({ size = 40 }: { size?: number }) {
  const user = useMeasureStore(x => x.session?.user);
  const [failed, setFailed] = useState(false);
  const color = user?.cargo?.color ?? '#475569';
  return user?.photoUrl && !failed ? (
    <Image
      source={{ uri: user.photoUrl }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  ) : (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.3 }]}>
        {initials(user?.name)}
      </Text>
    </View>
  );
}
function ProfileTrigger({ onPress }: { onPress: () => void }) {
  const user = useMeasureStore(x => x.session?.user);
  return (
    <Pressable onPress={onPress} style={styles.profileTrigger}>
      <ProfileAvatar />
      <View style={styles.profileTriggerText}>
        <Text numberOfLines={1} style={styles.profileFirstName}>
          {user?.name?.split(' ')[0] ?? 'Perfil'}
        </Text>
        <Text numberOfLines={1} style={styles.profileRole}>
          {user?.cargo?.name ?? 'Usuário'}
        </Text>
      </View>
      <ChevronDown size={15} color="rgba(255,255,255,.7)" />
    </Pressable>
  );
}
function ProfileCard({
  visible,
  close,
  openSync,
}: {
  visible: boolean;
  close: () => void;
  openSync: () => void;
}) {
  const s = useMeasureStore();
  const user = s.session?.user;
  const [detailsOpen, setDetailsOpen] = useState(false);
  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.profileBackdrop} onPress={close}>
          <Pressable style={styles.profileCard} onPress={() => {}}>
            <View style={styles.profileIdentity}>
              <ProfileAvatar size={60} />
              <View style={styles.profileIdentityText}>
                <Text numberOfLines={1} style={styles.profileName}>
                  {user?.name ?? 'Usuário'}
                </Text>
                <Text numberOfLines={1} style={styles.profileEmail}>
                  {user?.email ?? ''}
                </Text>
              </View>
            </View>
            {user?.company ? (
              <Text style={styles.profileCompany}>{user.company}</Text>
            ) : null}
            <View style={styles.profileRoleLine}>
              <View
                style={[
                  styles.roleDot,
                  { backgroundColor: user?.cargo?.color ?? colors.text3 },
                ]}
              />
              <Text style={styles.profileRoleName}>
                {user?.cargo?.name ?? 'Sem cargo'}
              </Text>
              {user?.sector ? (
                <Text style={styles.profileSector}>· {user.sector.name}</Text>
              ) : null}
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.connectionRow}>
              <View
                style={[
                  styles.connectionDot,
                  {
                    backgroundColor: s.online ? colors.success : colors.danger,
                  },
                ]}
              />
              <Text style={styles.connectionText}>
                {s.online ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Pressable
              style={styles.profileMenuItem}
              onPress={() => setDetailsOpen(true)}
            >
              <User size={17} color={colors.text2} />
              <Text style={styles.profileMenuText}>Meu perfil</Text>
            </Pressable>
            {user?.company ? (
              <View style={styles.profileDetail}>
                <Building2 size={16} color={colors.text3} />
                <Text style={styles.profileDetailText}>{user.company}</Text>
              </View>
            ) : null}
            {user?.cargo ? (
              <View style={styles.profileDetail}>
                <Briefcase size={16} color={colors.text3} />
                <Text style={styles.profileDetailText}>{user.cargo.name}</Text>
              </View>
            ) : null}
            <Pressable style={styles.profileMenuItem} onPress={openSync}>
              <RefreshCw size={17} color={colors.text2} />
              <Text style={styles.profileMenuText}>Sincronização</Text>
            </Pressable>
            <View style={styles.profileDivider} />
            <Pressable
              style={styles.profileMenuItem}
              onPress={() => {
                close();
                s.logout(false).then(
                  ok =>
                    !ok &&
                    Alert.alert(
                      'Alterações pendentes',
                      'Sincronize ou descarte antes de sair.',
                    ),
                );
              }}
            >
              <LogOut size={17} color={colors.danger} />
              <Text style={[styles.profileMenuText, { color: colors.danger }]}>
                Sair
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={visible && detailsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsOpen(false)}
      >
        <View style={styles.profilePageBackdrop}>
          <SafeAreaView style={styles.profilePage}>
            <View style={styles.profilePageHeader}>
              <Pressable
                style={styles.profileBack}
                onPress={() => setDetailsOpen(false)}
              >
                <ArrowLeft size={21} color={colors.text} />
              </Pressable>
              <Text style={styles.profilePageTitle}>Meu perfil</Text>
              <Pressable
                style={styles.profileBack}
                onPress={() => {
                  setDetailsOpen(false);
                  close();
                }}
              >
                <X size={20} color={colors.text2} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.profilePageContent}>
              <Card style={styles.profileHeroCard}>
                <ProfileAvatar size={92} />
                <Text style={styles.profileHeroName}>
                  {user?.name ?? 'Usuário'}
                </Text>
                <Text style={styles.profileHeroEmail}>{user?.email ?? ''}</Text>
                <View style={styles.profileRoleLine}>
                  <View
                    style={[
                      styles.roleDot,
                      { backgroundColor: user?.cargo?.color ?? colors.text3 },
                    ]}
                  />
                  <Text style={styles.profileRoleName}>
                    {user?.cargo?.name ?? 'Sem cargo'}
                  </Text>
                  {user?.sector ? (
                    <Text style={styles.profileSector}>
                      · {user.sector.name}
                    </Text>
                  ) : null}
                </View>
              </Card>
              <Card style={styles.profileDataCard}>
                <Text style={styles.profileDataTitle}>
                  Informações profissionais
                </Text>
                <View style={styles.profileDataRow}>
                  <Building2 size={19} color={colors.primary} />
                  <View>
                    <Text style={styles.profileDataLabel}>Empresa</Text>
                    <Text style={styles.profileDataValue}>
                      {user?.company ?? 'Não informada'}
                    </Text>
                  </View>
                </View>
                <View style={styles.profileDataRow}>
                  <Briefcase size={19} color={colors.primary} />
                  <View>
                    <Text style={styles.profileDataLabel}>Cargo</Text>
                    <Text style={styles.profileDataValue}>
                      {user?.cargo?.name ?? 'Não informado'}
                    </Text>
                  </View>
                </View>
                <View style={styles.profileDataRow}>
                  <User size={19} color={colors.primary} />
                  <View>
                    <Text style={styles.profileDataLabel}>Setor</Text>
                    <Text style={styles.profileDataValue}>
                      {user?.sector?.name ?? 'Não informado'}
                    </Text>
                  </View>
                </View>
              </Card>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
function Visits({ openSync }: { openSync: () => void }) {
  const s = useMeasureStore();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Visitas"
        subtitle={`${s.cache.visits.length} visita(s) no dispositivo`}
        openSync={openSync}
      />
      <ErrorBanner />
      <FlatList
        contentContainerStyle={styles.list}
        data={s.cache.visits}
        keyExtractor={x => x.id}
        ListHeaderComponent={
          <View>
            <View style={styles.pageIntro}>
              <Text style={styles.eyebrow}>TRABALHO DE CAMPO</Text>
              <Text style={styles.pageTitle}>Minhas visitas</Text>
              <Text style={styles.bodyMuted}>
                Continue uma medição ou inicie em outra obra.
              </Text>
            </View>
            <View style={styles.workSectionHeader}>
              <Text style={styles.workSectionTitle}>Todas as obras</Text>
              <Badge label={`${s.cache.works.length} obras`} tone="info" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workStrip}
            >
              {s.cache.works.map(work => (
                <Pressable
                  key={work.id}
                  onPress={() =>
                    Alert.alert(
                      'Iniciar medição',
                      `Criar uma nova visita para ${work.name}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Iniciar',
                          onPress: () => s.createVisit(work.id),
                        },
                      ],
                    )
                  }
                >
                  <Card style={styles.workCard}>
                    <View style={styles.visitIcon}>
                      <Building2 size={20} color={colors.primary} />
                    </View>
                    <Text numberOfLines={1} style={styles.workName}>
                      {work.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.cardMeta}>
                      {work.clientName ?? work.code}
                    </Text>
                    <View style={styles.workAction}>
                      <Plus size={15} color={colors.primary} />
                      <Text style={styles.workActionText}>Nova medição</Text>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.workSectionTitle}>Visitas em andamento</Text>
          </View>
        }
        ListEmptyComponent={
          <Card>
            <View style={styles.emptyIcon}>
              <ClipboardCheck size={26} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma visita armazenada</Text>
            <Text style={styles.emptyText}>
              Sincronize o aplicativo para baixar suas visitas.
            </Text>
            <View style={styles.mt16}>
              <AppButton
                icon={RefreshCw}
                label="Sincronizar"
                onPress={openSync}
              />
            </View>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => s.selectVisit(item.id)}>
            <Card style={styles.visitCard}>
              <View style={styles.rowTop}>
                <View style={styles.visitIcon}>
                  <MapPin size={20} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{item.workName}</Text>
                  <Text style={styles.cardMeta}>
                    {item.clientName ?? 'Cliente não informado'}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.text3} />
              </View>
              <View style={styles.visitInfo}>
                <Badge
                  label={labelize(item.status)}
                  tone={statusTone(item.status)}
                />
                <Text style={styles.progressLabel}>
                  {item.progress}% concluído
                </Text>
              </View>
              <ProgressBar value={item.progress} />
            </Card>
          </Pressable>
        )}
      />
      <View style={styles.bottomBar}>
        <AppButton
          variant="ghost"
          icon={LogOut}
          label="Sair"
          onPress={() =>
            s
              .logout(false)
              .then(
                ok =>
                  !ok &&
                  Alert.alert(
                    'Alterações pendentes',
                    'Sincronize ou descarte antes de sair.',
                  ),
              )
          }
        />
      </View>
    </SafeAreaView>
  );
}
function Field({ openSync }: { openSync: () => void }) {
  const s = useMeasureStore();
  const v = s.cache.visits.find(x => x.id === s.selectedVisitId);
  if (!v) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header
          title="Carregando obra"
          subtitle="Preparando a visita de medição"
          back={() => s.selectVisit()}
          openSync={openSync}
        />
        <ErrorBanner />
        <Loading />
      </SafeAreaView>
    );
  }
  const envs = s.cache.environments.filter(x => x.visitId === v.id);
  const observations = s.cache.observations.filter(x => x.visitId === v.id);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title={v.workName}
        subtitle={v.clientName ?? 'Cliente não informado'}
        back={() => s.selectVisit()}
        openSync={openSync}
      />
      <ErrorBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summary}>
          <View style={styles.rowTop}>
            <View style={styles.flex}>
              <Text style={styles.cardMeta}>
                {v.address ?? 'Endereço não informado'}
              </Text>
              <View style={styles.summaryStatus}>
                <Badge label={labelize(v.status)} tone={statusTone(v.status)} />
                <Text style={styles.progressLabel}>
                  {v.progress}% confirmado
                </Text>
              </View>
            </View>
            <View style={styles.metricCircle}>
              <Text style={styles.metricValue}>{v.progress}</Text>
              <Text style={styles.metricUnit}>%</Text>
            </View>
          </View>
          <ProgressBar value={v.progress} />
        </Card>
        <Section
          icon={Home}
          title="Ambientes mapeados"
          subtitle="Abra um ambiente para acessar seus elementos"
        >
          {envs.filter(x => !x.deletedAt).length ? (
            envs
              .filter(x => !x.deletedAt)
              .sort((a, b) => a.sequence - b.sequence)
              .map(environment => (
                <EnvironmentHierarchy
                  key={environment.id}
                  environment={environment}
                />
              ))
          ) : (
            <Card style={styles.hierarchyEmpty}>
              <Home size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Nenhum ambiente mapeado</Text>
              <Text style={styles.cardMeta}>
                Cadastre abaixo o primeiro ambiente desta obra.
              </Text>
            </Card>
          )}
          <EnvironmentForm />
          <RestoreRows
            rows={envs.filter(x => x.deletedAt)}
            restore={id => s.restore('environment', id)}
          />
        </Section>
        <Section
          icon={FileWarning}
          title="Observações"
          subtitle="Pendências e decisões de campo"
        >
          <ObservationForm />
          {observations.map(x => (
            <ObservationRow key={x.id} row={x} />
          ))}
        </Section>
        <Section
          icon={ClipboardCheck}
          title="Controle da visita"
          subtitle="Atualize a etapa do trabalho"
        >
          <View style={styles.actionGrid}>
            <AppButton
              variant="success"
              icon={Play}
              label="Iniciar"
              onPress={() => s.transition('start')}
            />
            <AppButton
              variant="warning"
              icon={Pause}
              label="Pausar"
              onPress={() => s.transition('pause')}
            />
            <AppButton
              variant="secondary"
              icon={RotateCcw}
              label="Retomar"
              onPress={() => s.transition('resume')}
            />
          </View>
          <AppButton
            full
            icon={Send}
            label="Enviar para revisão"
            disabled={s.cache.mutations.some(x => x.visitId === v.id)}
            onPress={() => s.transition('submit_review')}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
function EnvironmentHierarchy({
  environment,
}: {
  environment: Environment;
}) {
  const s = useMeasureStore();
  const expanded = s.selectedEnvironmentId === environment.id;
  const elements = s.cache.elements
    .filter(item => item.environmentId === environment.id)
    .sort((a, b) => a.sequence - b.sequence);
  const activeElements = elements.filter(item => !item.deletedAt);
  const archivedElements = elements.filter(item => item.deletedAt);

  function toggleEnvironment() {
    s.selectEnvironment(expanded ? undefined : environment.id);
  }

  return (
    <Card style={[styles.hierarchyEnvironment, expanded && styles.selected]}>
      <Pressable style={styles.hierarchyHeader} onPress={toggleEnvironment}>
        <View style={styles.hierarchyIndex}>
          <Text style={styles.hierarchyIndexText}>
            {environment.sequence + 1}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{environment.name}</Text>
          <Text style={styles.cardMeta}>
            {activeElements.length} elemento(s) cadastrado(s)
          </Text>
        </View>
        <SyncTag state={environment.syncState} />
        <ChevronDown
          size={20}
          color={colors.text2}
          style={expanded ? styles.chevronExpanded : undefined}
        />
      </Pressable>
      {environment.lastErrorMessage ? (
        <Text style={styles.inlineError}>{environment.lastErrorMessage}</Text>
      ) : null}
      {expanded ? (
        <View style={styles.hierarchyEnvironmentBody}>
          <View style={styles.hierarchyActions}>
            <AppButton
              small
              variant="ghost"
              icon={Edit3}
              label="Editar ambiente"
              onPress={() =>
                s.saveEnvironment({
                  ...environment,
                  name: `${environment.name} editado`,
                })
              }
            />
            <AppButton
              small
              variant="ghost"
              icon={Trash2}
              label="Arquivar"
              onPress={() => s.archive('environment', environment.id)}
            />
          </View>
          <View style={styles.hierarchyLevelLabel}>
            <DoorOpen size={18} color={colors.primary} />
            <Text style={styles.hierarchyLevelTitle}>Elementos do ambiente</Text>
          </View>
          {activeElements.length ? (
            activeElements.map(element => (
              <ElementHierarchy key={element.id} element={element} />
            ))
          ) : (
            <View style={styles.nestedEmpty}>
              <Text style={styles.cardMeta}>
                Nenhum elemento cadastrado neste ambiente.
              </Text>
            </View>
          )}
          <ElementForm />
          <RestoreRows
            rows={archivedElements}
            restore={id => s.restore('element', id)}
          />
        </View>
      ) : null}
    </Card>
  );
}

function ElementHierarchy({ element }: { element: Element }) {
  const s = useMeasureStore();
  const expanded = s.selectedElementId === element.id;
  const measures = s.cache.measurements.filter(
    item => item.elementId === element.id,
  );
  const photos = s.cache.photos.filter(item => item.elementId === element.id);

  return (
    <View style={[styles.hierarchyElement, expanded && styles.elementSelected]}>
      <Pressable
        style={styles.hierarchyHeader}
        onPress={() => s.selectElement(expanded ? undefined : element.id)}
      >
        <View style={styles.elementIcon}>
          <DoorOpen size={18} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{element.name}</Text>
          <Text style={styles.cardMeta}>
            {labelize(element.type)} · {photos.length} foto(s) · {measures.length}{' '}
            medida(s)
          </Text>
        </View>
        <SyncTag state={element.syncState} />
        <ChevronDown
          size={18}
          color={colors.text2}
          style={expanded ? styles.chevronExpanded : undefined}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.hierarchyElementBody}>
          <View style={styles.hierarchyActions}>
            <AppButton
              small
              variant="ghost"
              icon={Edit3}
              label="Editar"
              onPress={() =>
                s.saveElement({ ...element, name: `${element.name} editado` })
              }
            />
            <AppButton
              small
              variant="ghost"
              icon={Copy}
              label="Duplicar"
              onPress={() => s.duplicateElement(element.id, false)}
            />
            <AppButton
              small
              variant="ghost"
              icon={Trash2}
              label="Arquivar"
              onPress={() => s.archive('element', element.id)}
            />
          </View>
          <View style={styles.hierarchyLevelLabel}>
            <Ruler size={18} color={colors.primary} />
            <Text style={styles.hierarchyLevelTitle}>Fotos e medidas</Text>
          </View>
          <PhotoWorkspace />
          {measures.map(measure => (
            <MeasurementRow key={measure.id} row={measure} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Home;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}
function SyncTag({ state }: { state: SyncState }) {
  const error = ['ERROR', 'CONFLICT'].includes(state);
  return (
    <Badge
      label={syncLabel(state)}
      tone={error ? 'danger' : state === 'SYNCED' ? 'success' : 'info'}
    />
  );
}
function RestoreRows<T extends { id: string; name: string }>({
  rows,
  restore,
}: {
  rows: T[];
  restore: (id: string) => void;
}) {
  return (
    <>
      {rows.map(x => (
        <AppButton
          key={x.id}
          small
          variant="secondary"
          icon={RotateCcw}
          label={`Restaurar ${x.name}`}
          onPress={() => restore(x.id)}
        />
      ))}
    </>
  );
}
function EnvironmentForm() {
  const save = useMeasureStore(x => x.saveEnvironment);
  const [name, setName] = useState('');
  return (
    <Card style={styles.formCard}>
      <Text style={styles.label}>Novo ambiente</Text>
      <View style={styles.inlineForm}>
        <FieldInput
          style={styles.flex}
          placeholder="Ex.: Sala de estar"
          value={name}
          onChangeText={setName}
        />
        <AppButton
          icon={Plus}
          label="Adicionar"
          disabled={!name.trim()}
          onPress={() => {
            save({ name: name.trim() });
            setName('');
          }}
        />
      </View>
    </Card>
  );
}
const elementTypes = [
  'janela',
  'porta',
  'fachada',
  'guarda_corpo',
  'cobertura',
  'brise',
  'portao',
  'pele_de_vidro',
  'fechamento',
  'vao_livre',
  'estrutura_metalica',
  'personalizado',
];
function ElementForm() {
  const s = useMeasureStore();
  const [name, setName] = useState('');
  const [type, setType] = useState('janela');
  return (
    <Card style={styles.formCard}>
      <Text style={styles.label}>Novo elemento</Text>
      <FieldInput
        placeholder="Ex.: Janela da fachada"
        value={name}
        onChangeText={setName}
      />
      <Choices values={elementTypes} selected={type} choose={setType} />
      <AppButton
        full
        icon={Plus}
        label="Adicionar elemento"
        disabled={!s.selectedEnvironmentId || !name.trim()}
        onPress={() => {
          s.saveElement({ name: name.trim(), type });
          setName('');
        }}
      />
    </Card>
  );
}
function Choices({
  values,
  selected,
  choose,
}: {
  values: string[];
  selected: string;
  choose: (x: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.choices}
    >
      {values.map(x => (
        <Pressable
          key={x}
          onPress={() => choose(x)}
          style={[styles.choice, selected === x && styles.choiceSelected]}
        >
          <Text
            style={[
              styles.choiceText,
              selected === x && styles.choiceTextSelected,
            ]}
          >
            {labelize(x)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
function PhotoWorkspace() {
  const s = useMeasureStore();
  const [editing, setEditing] = useState<FieldPhoto | null>(null);
  const photos = s.cache.photos.filter(
    p =>
      p.visitId === s.selectedVisitId &&
      (!s.selectedElementId || p.elementId === s.selectedElementId),
  );
  async function add(source: 'camera' | 'library') {
    if (!s.session?.ownerId || !s.selectedVisitId) return;
    try {
      const photo = await acquirePhoto(
        s.session.ownerId,
        s.selectedVisitId,
        s.selectedEnvironmentId,
        s.selectedElementId,
        source,
      );
      if (photo) {
        await s.savePhoto(photo);
        setEditing(photo);
      }
    } catch (error) {
      Alert.alert(
        'Foto',
        error instanceof Error
          ? error.message
          : 'Não foi possível obter a foto.',
      );
    }
  }
  return (
    <Card style={styles.photoWorkspace}>
      <View style={styles.rowTop}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Fotos e cotas</Text>
          <Text style={styles.cardMeta}>
            {s.selectedElementId
              ? 'Registre a esquadria selecionada'
              : 'Selecione uma esquadria para fotografar'}
          </Text>
        </View>
        <Badge label={`${photos.length} foto(s)`} tone="info" />
      </View>
      <View style={styles.actions}>
        <AppButton
          small
          icon={Camera}
          label="Tirar foto"
          disabled={!s.selectedElementId}
          onPress={() => add('camera')}
        />
        <AppButton
          small
          variant="secondary"
          icon={Images}
          label="Galeria"
          disabled={!s.selectedElementId}
          onPress={() => add('library')}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoStrip}
      >
        {photos.map(photo => (
          <Pressable
            key={photo.id}
            onPress={() => setEditing(photo)}
            style={styles.photoThumbWrap}
          >
            <Image source={{ uri: photo.localUri }} style={styles.photoThumb} />
            <Badge
              label={`${photo.dimensions.length} cotas`}
              tone={photo.dimensions.length ? 'success' : 'warning'}
            />
          </Pressable>
        ))}
      </ScrollView>
      {editing ? (
        <PhotoEditor
          photo={s.cache.photos.find(p => p.id === editing.id) ?? editing}
          close={() => setEditing(null)}
        />
      ) : null}
    </Card>
  );
}
function PhotoEditor({
  photo,
  close,
}: {
  photo: FieldPhoto;
  close: () => void;
}) {
  const add = useMeasureStore(x => x.addPhotoDimension);
  const [mode, setMode] = useState('cota');
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [name, setName] = useState('Cota');
  const [unit, setUnit] = useState('mm');
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  function place(e: any) {
    if (points.length >= 2) return;
    setPoints([
      ...points,
      {
        x: Math.max(0, Math.min(1, e.nativeEvent.locationX / layout.width)),
        y: Math.max(0, Math.min(1, e.nativeEvent.locationY / layout.height)),
      },
    ]);
  }
  async function saveCurrent() {
    if (points.length !== 2) return;
    const n = mode === 'cota' ? Number(value.replace(',', '.')) : 0;
    if (mode === 'cota' && !Number.isFinite(n)) return;
    if (mode === 'observacao' && !note.trim()) return;
    await add(photo.id, {
      id: uuid(),
      kind: mode === 'cota' ? 'dimension' : 'leader',
      text: mode === 'observacao' ? note.trim() : undefined,
      name:
        mode === 'cota' ? name.trim() || 'Cota' : 'Observação',
      value: n,
      unit: mode === 'cota' ? unit : 'mm',
      x1: points[0].x,
      y1: points[0].y,
      x2: points[1].x,
      y2: points[1].y,
      color: colors.accent,
    });
    setPoints([]);
    setValue('');
    setNote('');
  }
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.editorSafe}>
        <View style={styles.profilePageHeader}>
          <Pressable style={styles.profileBack} onPress={close}>
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.profilePageTitle}>Editor de cotas</Text>
            <Text style={styles.cardMeta}>Toque em dois pontos da imagem</Text>
          </View>
          <AppButton
            small
            variant="secondary"
            icon={RotateCcw}
            label="Limpar"
            onPress={() => setPoints([])}
          />
        </View>
        <ScrollView contentContainerStyle={styles.editorContent}>
          <Card style={styles.editorModeCard}>
            <Text style={styles.label}>O que deseja inserir?</Text>
            <Choices
              values={['cota', 'observacao']}
              selected={mode}
              choose={selected => {
                setMode(selected);
                setPoints([]);
              }}
            />
            <Text style={styles.cardMeta}>
              {mode === 'cota'
                ? 'Toque nos dois pontos da medida.'
                : 'Toque no ponto observado e depois onde ficará o texto.'}
            </Text>
          </Card>
          <Pressable
            onLayout={e => setLayout(e.nativeEvent.layout)}
            onPress={place}
            style={[
              styles.editorImageFrame,
              { aspectRatio: photo.width / photo.height },
            ]}
          >
            <Image
              source={{ uri: photo.localUri }}
            style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
            <Svg
            style={StyleSheet.absoluteFill}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              {photo.dimensions.map(d => (
                <React.Fragment key={d.id}>
                  <Line
                    x1={d.x1 * layout.width}
                    y1={d.y1 * layout.height}
                    x2={d.x2 * layout.width}
                    y2={d.y2 * layout.height}
                    stroke={d.color}
                    strokeWidth="3"
                  />
                  <Circle
                    cx={d.x1 * layout.width}
                    cy={d.y1 * layout.height}
                    r="6"
                    fill={d.color}
                  />
                  <Circle
                    cx={d.x2 * layout.width}
                    cy={d.y2 * layout.height}
                    r="6"
                    fill={d.color}
                  />
                  <SvgText
                    x={
                      d.kind === 'leader'
                        ? d.x2 * layout.width + (d.x2 >= d.x1 ? 10 : -10)
                        : ((d.x1 + d.x2) * layout.width) / 2
                    }
                    y={
                      d.kind === 'leader'
                        ? d.y2 * layout.height - 7
                        : ((d.y1 + d.y2) * layout.height) / 2 - 8
                    }
                    fill="#FFFFFF"
                    stroke="#0F4C81"
                    strokeWidth="1"
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor={
                      d.kind === 'leader'
                        ? d.x2 >= d.x1
                          ? 'start'
                          : 'end'
                        : 'middle'
                    }
                  >
                    {d.kind === 'leader'
                      ? d.text ?? d.name
                      : `${d.value} ${d.unit}`}
                  </SvgText>
                </React.Fragment>
              ))}
              {points.length > 0 ? (
                <Circle
                  cx={points[0].x * layout.width}
                  cy={points[0].y * layout.height}
                  r="7"
                  fill={colors.accent}
                />
              ) : null}
              {points.length === 2 ? (
                <>
                  <Line
                    x1={points[0].x * layout.width}
                    y1={points[0].y * layout.height}
                    x2={points[1].x * layout.width}
                    y2={points[1].y * layout.height}
                    stroke={colors.accent}
                    strokeWidth="3"
                  />
                  <Circle
                    cx={points[1].x * layout.width}
                    cy={points[1].y * layout.height}
                    r="7"
                    fill={colors.accent}
                  />
                </>
              ) : null}
            </Svg>
            {mode === 'observacao' && points.length === 2 ? (
              <View
                style={[
                  styles.leaderComposer,
                  {
                    left: Math.max(
                      6,
                      Math.min(layout.width - 226, points[1].x * layout.width + 10),
                    ),
                    top: Math.max(
                      6,
                      Math.min(layout.height - 98, points[1].y * layout.height + 8),
                    ),
                  },
                ]}
              >
                <FieldInput
                  autoFocus
                  multiline
                  style={styles.leaderInput}
                  placeholder="Digite a observação"
                  value={note}
                  onChangeText={setNote}
                />
                <AppButton
                  small
                  icon={Check}
                  label="Salvar"
                  disabled={!note.trim()}
                  onPress={saveCurrent}
                />
              </View>
            ) : null}
          </Pressable>
          {points.length === 2 && mode === 'cota' ? (
            <Card style={styles.dimensionForm}>
              <FieldInput
                placeholder="Nome da cota"
                value={name}
                onChangeText={setName}
              />
              <FieldInput
                autoFocus
                placeholder={unit === 'graus' ? 'Ângulo' : 'Medida em mm'}
                keyboardType="decimal-pad"
                value={value}
                onChangeText={setValue}
              />
              <Choices
                values={['mm', 'graus']}
                selected={unit}
                choose={setUnit}
              />
              <AppButton
                full
                icon={Check}
                label="Salvar cota"
                disabled={!value.trim()}
                onPress={saveCurrent}
              />
            </Card>
          ) : points.length < 2 ? (
            <Text style={styles.editorHint}>
              {points.length === 0
                ? mode === 'cota'
                  ? 'Toque no ponto inicial da medida'
                  : 'Toque no ponto que deseja observar'
                : mode === 'cota'
                  ? 'Agora toque no ponto final da medida'
                  : 'Agora toque onde o texto deve aparecer'}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function MeasurementRow({ row }: { row: Measurement }) {
  const save = useMeasureStore(x => x.saveMeasurement);
  return (
    <Card style={styles.entityCard}>
      <View style={styles.rowTop}>
        <View>
          <Text style={styles.measureName}>{row.name}</Text>
          <Text style={styles.measureValue}>
            {row.value} <Text style={styles.measureUnit}>{row.unit}</Text>
          </Text>
        </View>
        <View style={styles.alignEnd}>
          <Badge
            label={labelize(row.state)}
            tone={
              row.state === 'confirmada'
                ? 'success'
                : row.state === 'invalidada'
                ? 'danger'
                : 'warning'
            }
          />
          <SyncTag state={row.syncState} />
        </View>
      </View>
      <View style={styles.actions}>
        <AppButton
          small
          variant="success"
          icon={Check}
          label="Confirmar"
          onPress={() =>
            save({ ...row, value: row.value, state: 'confirmada' })
          }
        />
        <AppButton
          small
          variant="secondary"
          icon={Eye}
          label="Revisar"
          onPress={() => save({ ...row, value: row.value, state: 'revisar' })}
        />
        <AppButton
          small
          variant="danger"
          icon={X}
          label="Invalidar"
          onPress={() =>
            save({ ...row, value: row.value, state: 'invalidada' })
          }
        />
      </View>
    </Card>
  );
}
function ObservationForm() {
  const s = useMeasureStore();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('informacao');
  const [important, setImportant] = useState(false);
  return (
    <Card style={styles.formCard}>
      <Text style={styles.label}>Nova observação</Text>
      <FieldInput
        multiline
        placeholder="Descreva o que foi observado em campo"
        value={text}
        onChangeText={setText}
      />
      <Choices
        values={[
          'informacao',
          'atencao',
          'impedimento',
          'decisao_cliente',
          'pendencia',
          'risco',
          'revisao_necessaria',
        ]}
        selected={category}
        choose={setCategory}
      />
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.label}>Marcar como importante</Text>
          <Text style={styles.cardMeta}>Destaca esta anotação na revisão</Text>
        </View>
        <Switch
          trackColor={{ false: colors.surface3, true: colors.accentSoft }}
          thumbColor={important ? colors.accent : colors.text3}
          value={important}
          onValueChange={setImportant}
        />
      </View>
      <AppButton
        full
        icon={Plus}
        label="Adicionar observação"
        disabled={!text.trim()}
        onPress={() => {
          s.saveObservation({ text: text.trim(), category, important });
          setText('');
        }}
      />
    </Card>
  );
}
function ObservationRow({ row }: { row: Observation }) {
  const save = useMeasureStore(x => x.saveObservation);
  const critical = ['impedimento', 'risco', 'revisao_necessaria'].includes(
    row.category,
  );
  return (
    <Card style={[styles.entityCard, critical && styles.critical]}>
      <View style={styles.rowTop}>
        <Badge
          label={labelize(row.category)}
          tone={critical ? 'danger' : row.important ? 'warning' : 'info'}
        />
        <SyncTag state={row.syncState} />
      </View>
      <Text style={styles.observationText}>{row.text}</Text>
      <AppButton
        small
        variant={row.resolvedAt ? 'secondary' : 'success'}
        icon={row.resolvedAt ? RotateCcw : Check}
        label={row.resolvedAt ? 'Reabrir' : 'Resolver'}
        onPress={() =>
          save({
            ...row,
            resolvedAt: row.resolvedAt ? null : new Date().toISOString(),
          })
        }
      />
    </Card>
  );
}
function SyncScreen({ close }: { close: () => void }) {
  const s = useMeasureStore();
  const pending =
    s.cache.mutations.filter(x => x.status === 'PENDING').length +
    s.cache.photos.filter(x => x.syncState !== 'SYNCED').length;
  const errors = s.cache.mutations.filter(x => x.status === 'ERROR').length;
  const conflicts = s.cache.mutations.filter(
    x => x.status === 'CONFLICT',
  ).length;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Sincronização"
        subtitle="Dados deste dispositivo"
        back={close}
        openSync={close}
      />
      <ErrorBanner />
      <FlatList
        contentContainerStyle={styles.content}
        data={s.cache.mutations}
        keyExtractor={x => x.id}
        ListHeaderComponent={
          <>
            <Card style={styles.syncHero}>
              <View
                style={[
                  styles.syncIcon,
                  s.online ? styles.syncOnline : styles.syncOffline,
                ]}
              >
                {s.online ? (
                  <Cloud size={30} color={colors.success} />
                ) : (
                  <CloudOff size={30} color={colors.warning} />
                )}
              </View>
              <Text style={styles.syncTitle}>
                {s.online ? 'Conectado e pronto' : 'Trabalhando offline'}
              </Text>
              <Text style={styles.bodyMuted}>
                {s.online
                  ? 'Envie as alterações armazenadas neste aparelho.'
                  : 'Seus dados estão salvos e serão enviados quando a conexão voltar.'}
              </Text>
              <Text style={styles.lastSync}>
                Última sincronização: {formatDate(s.cache.lastSyncAt)}
              </Text>
              <AppButton
                full
                icon={RefreshCw}
                label={s.busy ? 'Sincronizando…' : 'Sincronizar agora'}
                disabled={!s.online || s.busy}
                onPress={s.sync}
              />
            </Card>
            <View style={styles.stats}>
              <Stat value={pending} label="Pendentes" tone="info" />
              <Stat value={errors} label="Erros" tone="danger" />
              <Stat value={conflicts} label="Conflitos" tone="warning" />
            </View>
            <Text style={styles.listTitle}>Fila de alterações</Text>
          </>
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>Tudo sincronizado</Text>
            <Text style={styles.emptyText}>
              Não há alterações pendentes neste dispositivo.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.entityCard}>
            <View style={styles.rowTop}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>
                  {labelize(item.entityType)}
                </Text>
                <Text style={styles.cardMeta}>
                  {labelize(item.operation)} · tentativa {item.attemptCount}
                </Text>
              </View>
              <Badge
                label={labelize(item.status)}
                tone={
                  item.status === 'ERROR'
                    ? 'danger'
                    : item.status === 'CONFLICT'
                    ? 'warning'
                    : 'info'
                }
              />
            </View>
            {item.lastErrorCode && (
              <Text style={styles.inlineError}>
                {item.lastErrorCode}: {item.lastErrorMessage}
              </Text>
            )}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'info' | 'danger' | 'warning';
}) {
  return (
    <Card style={styles.stat}>
      <Badge label={label} tone={tone} />
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}
function labelize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function syncLabel(s: SyncState) {
  return (
    (
      {
        SYNCED: 'Sincronizado',
        PENDING: 'Pendente',
        SYNCING: 'Enviando',
        ERROR: 'Erro',
        CONFLICT: 'Conflito',
      } as Record<string, string>
    )[s] ?? labelize(s)
  );
}
function statusTone(
  status: string,
): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  if (['concluida'].includes(status)) return 'success';
  if (['cancelada', 'correcao_solicitada'].includes(status)) return 'danger';
  if (['pausada', 'aguardando_revisao'].includes(status)) return 'warning';
  if (['em_andamento', 'em_deslocamento'].includes(status)) return 'info';
  return 'primary';
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'nunca';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  loginSafe: { flex: 1, backgroundColor: colors.header },
  loginHero: { paddingHorizontal: 28, paddingTop: 44, paddingBottom: 34 },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loginBrand: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.7,
  },
  loginSubtitle: { fontSize: 15, color: 'rgba(255,255,255,.72)', marginTop: 5 },
  loginPanel: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.accent,
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  bodyMuted: { fontSize: 14, lineHeight: 21, color: colors.text2 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  loginFoot: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text3,
    marginTop: 4,
  },
  header: {
    backgroundColor: colors.header,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  headerMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1 },
  headerText: { fontSize: 18, fontWeight: '800', color: colors.white },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,.68)',
    marginTop: 2,
  },
  syncButton: {
    minWidth: 42,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { fontSize: 9, fontWeight: '800', color: colors.white },
  list: { padding: 16, gap: 12, paddingBottom: 90 },
  content: { padding: 16, gap: 14, paddingBottom: 42 },
  pageIntro: { marginBottom: 8 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  workSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  workSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 18,
    marginBottom: 10,
  },
  workStrip: { gap: 10, paddingRight: 16, paddingBottom: 4 },
  workCard: { width: 230, minHeight: 148, gap: 8 },
  workName: { fontSize: 15, fontWeight: '800', color: colors.text },
  workAction: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workActionText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  visitCard: { gap: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  visitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.text2, marginTop: 3 },
  visitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
  summary: { gap: 14 },
  summaryStatus: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  metricCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  metricValue: { fontSize: 22, fontWeight: '900', color: colors.accent },
  metricUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 7,
  },
  section: { gap: 10, marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  sectionSubtitle: { fontSize: 12, color: colors.text2, marginTop: 1 },
  entityCard: { gap: 12 },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  hierarchyEmpty: { alignItems: 'center', paddingVertical: 22 },
  hierarchyEnvironment: { gap: 0, padding: 0, overflow: 'hidden' },
  hierarchyHeader: {
    minHeight: 68,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hierarchyIndex: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hierarchyIndexText: { color: colors.primary, fontWeight: '900' },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  hierarchyEnvironmentBody: {
    padding: 12,
    paddingTop: 4,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  hierarchyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  hierarchyLevelLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  hierarchyLevelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  hierarchyElement: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  elementSelected: { borderColor: colors.accent },
  elementIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hierarchyElementBody: {
    padding: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface2,
  },
  nestedEmpty: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  critical: { borderColor: colors.danger, backgroundColor: '#FFF9F8' },
  formCard: { gap: 11, backgroundColor: colors.surface2 },
  inlineForm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 10,
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choices: { gap: 7, paddingVertical: 2 },
  choice: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceText: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  choiceTextSelected: { color: colors.primary },
  measureName: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  measureValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginTop: 3,
  },
  measureUnit: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  photoWorkspace: { gap: 12, backgroundColor: colors.surface2 },
  photoStrip: { gap: 10 },
  photoThumbWrap: { width: 132, gap: 6 },
  photoThumb: {
    width: 132,
    height: 92,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  editorSafe: { flex: 1, backgroundColor: colors.bg },
  editorContent: { padding: 16, gap: 14 },
  editorImageFrame: {
    width: '100%',
    maxHeight: 720,
    minHeight: 260,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  dimensionForm: { gap: 10 },
  editorModeCard: { gap: 9, backgroundColor: colors.surface2 },
  leaderComposer: {
    position: 'absolute',
    width: 216,
    padding: 7,
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,255,255,0.96)',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  leaderInput: {
    minHeight: 54,
    maxHeight: 90,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editorHint: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    padding: 12,
  },
  alignEnd: { alignItems: 'flex-end', gap: 5 },
  observationText: { fontSize: 14, lineHeight: 21, color: colors.text },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  errorTitle: { fontSize: 13, fontWeight: '800', color: colors.danger },
  errorText: { fontSize: 12, lineHeight: 17, color: '#991B1B', marginTop: 2 },
  inlineError: {
    fontSize: 12,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 9,
    borderRadius: radius.sm,
  },
  warning: {
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    flexDirection: 'row',
    gap: 9,
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#92400E' },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text2,
    marginTop: 4,
  },
  mt16: { marginTop: 16 },
  syncHero: { alignItems: 'center', gap: 11, padding: 22 },
  syncIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncOnline: { backgroundColor: colors.successSoft },
  syncOffline: { backgroundColor: colors.warningSoft },
  syncTitle: { fontSize: 21, fontWeight: '800', color: colors.text },
  lastSync: { fontSize: 11, color: colors.text3, marginBottom: 5 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 12, padding: 12 },
  statValue: { fontSize: 25, fontWeight: '900', color: colors.text },
  profileTrigger: {
    minHeight: 48,
    maxWidth: 210,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  profileTriggerText: { maxWidth: 120 },
  profileFirstName: { fontSize: 13, fontWeight: '700', color: colors.white },
  profileRole: { fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 2 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontWeight: '800', color: colors.white },
  profileBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,.22)' },
  profileCard: {
    position: 'absolute',
    right: 16,
    top: 72,
    width: 310,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  profileIdentityText: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 12, color: colors.text3, marginTop: 3 },
  profileCompany: {
    fontSize: 12,
    color: colors.text3,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  profileRoleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  profileRoleName: { fontSize: 12, color: colors.text2 },
  profileSector: { flex: 1, fontSize: 12, color: colors.text3 },
  profileDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 12, color: colors.text3 },
  profileMenuItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  profileMenuText: { fontSize: 14, fontWeight: '600', color: colors.text2 },
  profileDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.surface2,
  },
  profileDetailText: { flex: 1, fontSize: 12, color: colors.text2 },
  profilePageBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  profilePage: {
    height: '88%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  profilePageHeader: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  profileBack: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },
  profilePageTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  profilePageContent: { padding: 20, gap: 14 },
  profileHeroCard: { alignItems: 'center', paddingVertical: 26 },
  profileHeroName: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text,
    marginTop: 14,
  },
  profileHeroEmail: { fontSize: 14, color: colors.text3, marginTop: 4 },
  profileDataCard: { gap: 4 },
  profileDataTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  profileDataRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  profileDataLabel: { fontSize: 11, color: colors.text3 },
  profileDataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 5,
  },
});
