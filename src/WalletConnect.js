import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

// Pobieramy sieć z konfiguracji środowiska
const network = process.env.REACT_APP_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const inscriptions = [
  {
    id: 'b303d7d750bd94e863cfb8aff51c2819aa6efbed74ffdc2347bbe885803fb034i0',
    imageUrl: 'https://homemadegame.com/images/polo-foto01.jpeg',
  },
  {
    id: 'ddfe965edfd29fb950d400fff15cbe6fe2157a3cce982632d6ea1cf37a41b01di0',
    imageUrl: 'https://homemadegame.com/images/polo-foto02.jpeg',
  },
  {
    id: 'ea2269911bef92cec2398284c911daecf6cf536f409c34924e88c3d4e25bc52ci0',
    imageUrl: 'https://homemadegame.com/images/polo-foto03.jpeg',
  },
];

const infoMessage = "If you don't want to log in or are experiencing issues with logging in, please contact us at homemadegame.apps@gmail.com. In your message, make sure to include your wallet ID and transaction ID to receive your image.";

const WalletConnect = () => {
  const [address, setAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [ownedInscriptions, setOwnedInscriptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState(''); // Obsługa błędów

  useEffect(() => {
    // Sprawdzamy, czy użytkownik jest zalogowany
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const stxAddress = network.isMainnet() ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;
      setAddress(stxAddress);
      setConnected(true);
      checkInscriptions(stxAddress);
    } else if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then(() => {
        const userData = userSession.loadUserData();
        const stxAddress = network.isMainnet() ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;
        setAddress(stxAddress);
        setConnected(true);
        checkInscriptions(stxAddress);
      });
    }
  }, []);

  const authenticate = () => {
    showConnect({
      appDetails: {
        name: 'Ordinals DApp',
        icon: 'https://hiro.so/static/favicon.ico',
      },
      userSession,
      network,
      onFinish: () => {
        const userData = userSession.loadUserData();
        const stxAddress = network.isMainnet() ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;
        setAddress(stxAddress);
        setConnected(true);
        checkInscriptions(stxAddress);
      },
    });
  };

  const checkInscriptions = async (address) => {
    try {
      const response = await axios.post('https://verify-nft-1f716b00da6a.herokuapp.com/check-inscriptions', { address });
      const userInscriptions = response.data.inscriptions;

      const owned = inscriptions.filter((inscription) =>
        userInscriptions.some((userInscription) => userInscription.inscription_id === inscription.id)
      );

      if (owned.length > 0) {
        setOwnedInscriptions(owned);
        checkIfUserExists(address); // Sprawdzenie, czy użytkownik istnieje w bazie danych
      } else {
        setErrorMessage("You don't own any of our inscriptions. If you purchased one, please contact us at: homemadegame.apps@gmail.com");
      }
    } catch (error) {
      console.error('Error checking inscriptions:', error);
    }
  };

  const checkIfUserExists = async (walletId) => {
    try {
      const response = await axios.post('https://verify-nft-1f716b00da6a.herokuapp.com/check-user', {
        wallet_id: walletId,
      });
      if (!response.data.exists) {
        setShowEmailForm(true); // Pokaż formularz, jeśli użytkownik nie istnieje
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
    }
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setFormError(''); // Reset błędu
    try {
      await axios.post('https://verify-nft-1f716b00da6a.herokuapp.com/save-wallet', {
        email,
        wallet_id: address,
      });
      setFormSubmitted(true);
      setShowEmailForm(false);
    } catch (error) {
      setFormError('Error submitting your email. Please try again.');
      console.error('Error saving email:', error);
    }
  };

  const logout = () => {
    userSession.signUserOut(window.location.origin);
    setConnected(false);
    setAddress('');
    setOwnedInscriptions([]);
  };

  return (
    <div>
      <section id="images" className="counter w-100 pt-5 pb-0 pb-5" style={{ background: '#fff' }}>
        <div className="container-min">
          <div className="row justify-content-center text-center">
            <picture>
              <source
                srcSet="https://homemadegame.com/wp-content/uploads/2023/05/HomeMadeGame.webp"
                type="image/webp"
              />
              <source
                srcSet="https://homemadegame.com/wp-content/uploads/2023/05/HomeMadeGame.jpg"
                type="image/jpeg"
              />
              <img
                decoding="async"
                className="img-fluid"
                src="https://homemadegame.com/wp-content/uploads/2023/05/HomeMadeGame.jpg"
                alt=""
                loading="lazy"
              />
            </picture>
          </div>
          <div className="d-flex flex-column flex-sm-row justify-content-around align-items-center text-center mt-5">
            <picture>
              <source
                srcSet="https://homemadegame.com/wp-content/uploads/2024/09/iTunesArtwork@2xp@2x.webp"
                type="image/webp"
              />
              <source
                srcSet="https://homemadegame.com/wp-content/uploads/2024/09/iTunesArtwork@2xp@2x.jpg"
              />
              <img
                decoding="async"
                className="img-fluid images-img"
                src="https://homemadegame.com/wp-content/uploads/2024/09/iTunesArtwork@2xp@2x.png"
                alt=""
                loading="lazy"
              />
            </picture>
          </div>
        </div>
      </section>

      {connected ? (
        <div className="pt-5 container-min">
          <div className="row justify-content-center text-center">
            <p>Connected address: {address}</p>
            <button onClick={logout} className="button button-red">Logout</button>
            {ownedInscriptions.length > 0 ? (
              <div>
                <h3>Your inscriptions: </h3>
                {ownedInscriptions.map((inscription) => (
                  <div className="pt-5" key={inscription.id}>
                    <img src={inscription.imageUrl} alt={`Inscription ${inscription.id}`} className="img-fluid mt-3" />
                    <a href={inscription.imageUrl} className="button" download target="_blank" rel="noreferrer">Download Image</a>
                  </div>
                ))}
              </div>
            ) : (
              errorMessage && <p>{errorMessage}</p>
            )}

            {showEmailForm && !formSubmitted && (
              <div className="pt-5">
                <h3>Enter your email to receive updates:</h3>
                <form onSubmit={handleSubmitEmail}>
                  <input
                    type="email"
                    value={email}
                    className="input"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                  />
                  <button type="submit" className="button">Submit</button>
                </form>
                {formError && <p style={{ color: 'red' }}>{formError}</p>} {/* Komunikat błędu */}
              </div>
            )}
            {formSubmitted && <p>Your email has been submitted. Thank you!</p>}
          </div>
        </div>
      ) : (
        <div className="container-min pt-main">
          <div className="row justify-content-center text-center">
            <button onClick={authenticate} className="button">Login Your Wallet</button>
          </div>
          <div className="pt-5 text-center">
            {infoMessage}
          </div>
        </div>
      )}

    </div>
  );
};

export default WalletConnect;