import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { v4 as uuid } from 'uuid';
import { FieldPhoto } from './types';

export async function acquirePhoto(
  ownerId: string,
  visitId: string,
  environmentId?: string,
  elementId?: string,
  source: 'camera' | 'library' = 'camera',
): Promise<FieldPhoto | null> {
  const result =
    source === 'camera'
      ? await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.9,
          saveToPhotos: false,
        })
      : await launchImageLibrary({
          mediaType: 'photo',
          selectionLimit: 1,
          quality: 0.9,
        });
  if (result.didCancel) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri || !asset.width || !asset.height)
    throw new Error(result.errorMessage ?? 'Não foi possível obter a foto.');
  const id = uuid();
  const dir = `${RNFS.DocumentDirectoryPath}/squadmeasure/${ownerId}/${visitId}`;
  await RNFS.mkdir(dir);
  const ext = (asset.fileName?.split('.').pop() || 'jpg').replace(
    /[^a-zA-Z0-9]/g,
    '',
  );
  const path = `${dir}/${id}.${ext}`;
  await RNFS.copyFile(asset.uri, path);
  return {
    id,
    ownerId,
    visitId,
    environmentId,
    elementId,
    localUri: `file://${path}`,
    width: asset.width,
    height: asset.height,
    mimeType: asset.type ?? 'image/jpeg',
    fileSize: asset.fileSize,
    capturedAt: new Date().toISOString(),
    syncState: 'LOCAL_ONLY',
    dimensions: [],
  };
}
