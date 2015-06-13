# gamingtok
A tournament platform with built-in video chat powered by OpenTok.

# Usage

You'll need to get an `apiKey` and `apiSecret` for OpenTok by setting up an account at [tokbox.com](https://tokbox.com/).

Create this config file:
<pre>
{
  "port": <i><b>choose-a-port</b></i>
  "opentokAuth": {
    "apiKey": <i><b>your-api-key</b></i>
    "apiSecret": <i><b>your-api-secret</b></i>
  }
}
</pre>

<pre>
git clone git@github.com:voltrevo/gamingtok.git
cd gamingtok
npm install
npm start -- <i><b>your-config-file</b></i>
</pre>

Visit http://localhost:<i><b>your-port</b></i>/.

# Planning
- Better docs ;-)
- Port messaging to sockception
- Lobby area for waiting participants
- Text chat
- Separate game logic and support more games via plugin design
- Make rock-paper-scissors into a real-time battle and move to separate repo
- Support multiple rooms
- Use alertify
- OAuth2 integration
