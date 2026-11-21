package expo.modules.memoraid.google

import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.MessageDigest
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GoogleSignInModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MemoraidGoogleSignIn")

    AsyncFunction("signIn") Coroutine { webClientId: String ->
      val activity = appContext.currentActivity
        ?: throw CodedException("ERR_GOOGLE_ACTIVITY", "Open Memoraid and try again.", null)
      val nonce = UUID.randomUUID().toString()
      // Supabase verifies the hash in the token against the original nonce.
      val hashedNonce = MessageDigest.getInstance("SHA-256")
        .digest(nonce.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }
      val option = GetSignInWithGoogleOption.Builder(webClientId).setNonce(hashedNonce).build()
      val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

      val credential = try {
        withContext(Dispatchers.Main) {
          CredentialManager.create(activity).getCredential(activity, request).credential
        }
      } catch (_: GetCredentialCancellationException) {
        return@Coroutine null
      } catch (error: NoCredentialException) {
        throw CodedException(
          "ERR_GOOGLE_NO_ACCOUNT",
          "No Google account is available. Add an account in Android Settings and try again.",
          error
        )
      } catch (error: GetCredentialException) {
        throw CodedException(
          "ERR_GOOGLE_SIGN_IN",
          "Google sign-in is unavailable. Try again or use an email link.",
          error
        )
      }

      if (credential !is CustomCredential ||
        credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
      ) {
        throw CodedException("ERR_GOOGLE_CREDENTIAL", "Google did not return a sign-in credential.", null)
      }

      val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
      mapOf("token" to token, "nonce" to nonce)
    }

    AsyncFunction("clearCredentialState").Coroutine<Unit> {
      appContext.reactContext?.let { context ->
        CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
      }
    }
  }
}
