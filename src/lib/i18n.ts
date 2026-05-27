// Flat Italian string map. Keep keys grouped by area with a dot prefix.
// All user-facing copy goes here so we have a single source of truth.

export const t = {
  // Brand
  'brand.name': 'GeoLeague',
  'brand.tagline': 'Una via. Un panorama. Due ore.',

  // Home — new design keys
  'home.dateHeader': 'Mercoledì 27 maggio · Settimana {week}',
  'home.dailyChallengeLabel': 'Sfida di oggi · Giorno {day}',
  'home.opensIn': 'Apre fra {duration}',
  'home.cta.start': 'Inizia la sfida',
  'home.cta.remind': 'Avvisami alle {time}',
  'home.privacyHint': 'Posizione esatta visibile solo dopo la chiusura della finestra',
  'home.yesterdayLabel': 'Ieri · Giorno {day}',
  'home.yesterdaySummary': '{score} punti da {place}.',
  'home.viewResult': 'Rivedi risultato',
  'home.stats.streak': 'Striscia',
  'home.stats.best': 'Migliore',
  'home.stats.rank': 'Posizione',
  'home.leaderboardTitle': 'Classifica settimanale',
  'home.viewAll': 'Vedi tutto',

  // Challenge — new design keys
  'challenge.timerLabel': 'Tempo rimasto',
  'challenge.submit': 'Invia ipotesi',
  'challenge.confirm': 'Conferma',
  'challenge.placePin': 'Piazza il segnaposto',
  'challenge.pinPlaced': 'Pin posizionato',
  'challenge.pause': 'Pausa',
  'challenge.kbHint': 'drag per esplorare · tap sulla mappa per piazzare · Enter per inviare',

  // Result — new design keys
  'result.label': 'Risultato · Giorno {day}',
  'result.headline': 'A {km} km da {place}.',
  'result.breakdown': 'Dettaglio punteggio',
  'result.bonusSpeed': 'Bonus velocità',
  'result.total': 'Totale',
  'result.weeklySection': 'Settimana',
  'result.weeklyPosition': '#{rank}',
  'result.cta.leaderboard': 'Vedi classifica completa',
  'result.cta.share': 'Condividi',
  'result.cta.home': 'Torna alla home',
  'result.revealLabel': 'Luogo rivelato',
  'result.openInMaps': 'Apri in Google Maps',

  // Footer
  'footer.tagline': '© 2026 geoleague · una sfida al giorno',

  // Common
  'common.email': 'Email',
  'common.password': 'Password',
  'common.submit': 'Conferma',
  'common.cancel': 'Annulla',
  'common.loading': 'Caricamento…',
  'common.required': 'Campo obbligatorio',

  // Auth — labels
  'auth.login.title': 'Accedi',
  'auth.login.submit': 'Accedi',
  'auth.login.no_account': 'Non hai un account?',
  'auth.login.signup_link': 'Registrati',
  'auth.login.forgot': 'Password dimenticata?',

  'auth.signup.title': 'Crea il tuo account',
  'auth.signup.submit': 'Registrati',
  'auth.signup.have_account': 'Hai già un account?',
  'auth.signup.login_link': 'Accedi',
  'auth.signup.check_email':
    "Ti abbiamo inviato un'email per confermare l'indirizzo. Clicca il link per attivare l'account.",

  'auth.reset.title': 'Recupera la password',
  'auth.reset.submit': 'Invia il link',
  'auth.reset.back': 'Torna ad accedere',
  'auth.reset.sent':
    'Se esiste un account con questa email, ti abbiamo inviato un link per reimpostare la password.',
  'auth.reset.update_title': 'Imposta una nuova password',
  'auth.reset.update_submit': 'Aggiorna la password',
  'auth.reset.update_ok': 'Password aggiornata. Ti reindirizziamo…',

  // Auth — errors
  'auth.error.invalid_credentials': 'Email o password non corretti.',
  'auth.error.email_invalid': 'Inserisci un indirizzo email valido.',
  'auth.error.password_short': 'La password deve avere almeno 8 caratteri.',
  'auth.error.email_already_registered': 'Questa email è già registrata.',
  'auth.error.generic': 'Qualcosa è andato storto. Riprova.',
  'auth.error.callback': 'Impossibile completare il login. Riprova.',
  'auth.error.session_expired': 'La sessione è scaduta. Accedi di nuovo.',

  // Settings
  'settings.title': 'Impostazioni',
  'settings.display_name': 'Nome visualizzato',
  'settings.display_name_help': 'Il nome che apparirà nelle classifiche. Max 32 caratteri.',
  'settings.save': 'Salva',
  'settings.saved': 'Modifiche salvate.',
  'settings.logout': 'Esci',
  'settings.error.too_long': 'Massimo 32 caratteri.',
  'settings.error.generic': 'Salvataggio non riuscito. Riprova.',

  // Nav
  'nav.settings': 'Impostazioni',
  'nav.home': 'Home',
  'nav.profile': 'Profilo',
  'nav.leaderboard': 'Classifica',

  // Home / empty state
  'home.no_challenge.title': 'Nessuna sfida attiva',
  'home.no_challenge.body':
    'La sfida quotidiana parte ogni giorno tra le 09:00 e le 17:00. Ti avviseremo.',
  'home.play_cta': 'Gioca la sfida di oggi',
  'home.view_result_cta': 'Vedi il tuo risultato',

  // Play
  'play.title': 'Indovina dove ti trovi',
  'play.submit': 'Invia il tiro',
  'play.confirm': 'Confermi questo punto?',
  'play.confirm_yes': 'Conferma',
  'play.confirm_no': 'Annulla',
  'play.no_pin': 'Posiziona il pin sulla mappa',
  'play.window_label': 'Tempo rimasto',
  'play.opening': 'Caricamento della sfida…',
  'play.error.window_closed':
    'La finestra di gioco è chiusa. Riprova domani.',
  'play.error.already_submitted': 'Hai già inviato la tua risposta.',
  'play.error.not_opened': 'Devi aprire la sfida prima di inviare.',
  'play.error.invalid_guess': 'Posizione del pin non valida.',
  'play.error.generic': "Errore durante l'invio. Riprova.",

  // Result
  'result.title': 'Risultato',
  'result.your_score': 'Punteggio',
  'result.distance': 'Distanza',
  'result.base': 'Base',
  'result.speed_bonus': 'Bonus velocità',
  'result.multiplier': 'Moltiplicatore',
  'result.actual_location': 'Posizione esatta',
  'result.your_guess': 'Il tuo tiro',
  'result.back_home': 'Torna alla home',
  'result.share': 'Condividi',
  'result.share.copied': 'Link copiato!',
  'result.share.failed': 'Condivisione non riuscita.',
  'result.share.title_template': 'Ho fatto {{score}} punti su GeoLeague',
  'result.weekly_rank': 'Posizione settimanale',
  'result.view_leaderboard': 'Vedi classifica',

  // Profile
  'profile.title': 'Profilo',
  'profile.stats.total_plays': 'Sfide giocate',
  'profile.stats.total_score': 'Punti totali',
  'profile.stats.avg_score': 'Punti medi',
  'profile.stats.best_score': 'Miglior punteggio',
  'profile.stats.best_distance': 'Miglior distanza',
  'profile.stats.streak': 'Striscia attuale',
  'profile.stats.longest_streak': 'Striscia più lunga',
  'profile.stats.weekly_rank': 'Posizione settimanale',
  'profile.stats.monthly_rank': 'Posizione mensile',
  'profile.history.title': 'Storico',
  'profile.history.empty':
    'Non hai ancora giocato nessuna sfida conclusa. Torna domani dopo la chiusura della finestra.',
  'profile.history.legend': 'Colore del punto = fascia di punteggio',
  'profile.public.unknown': 'Giocatore sconosciuto',
  'profile.public.no_stats':
    'Questo giocatore non ha ancora completato sfide.',

  // Leaderboard
  'leaderboard.title': 'Classifica',
  'leaderboard.tab_weekly': 'Settimana',
  'leaderboard.tab_monthly': 'Mese',
  'leaderboard.col_rank': '#',
  'leaderboard.col_player': 'Giocatore',
  'leaderboard.col_plays': 'Sfide',
  'leaderboard.col_score': 'Punti',
  'leaderboard.empty':
    'Nessuna partita ancora in questo periodo. Sii il primo a giocare!',
  'leaderboard.you': 'Tu',
  'leaderboard.your_rank': 'La tua posizione',
  'leaderboard.not_ranked':
    'Non sei ancora in classifica. Gioca la sfida di oggi.',
  'leaderboard.period_weekly': 'Settimana dal',
  'leaderboard.period_monthly': 'Mese di',
} as const;

export type TranslationKey = keyof typeof t;
