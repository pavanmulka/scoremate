import { Redirect, type Href } from 'expo-router';

export default function ProScreen() {
  return <Redirect href={'/matches/app-settings' as Href} />;
}
