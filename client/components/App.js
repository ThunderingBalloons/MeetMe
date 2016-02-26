class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      placesList: [],
      addressesList: [],
      currentPage: '/login'
    };
  }

  // handleClick(event){
  //  var videoName = event.target.innerHTML;
  //  for(var i = 0 ; i < this.state.videoList.length ; i++){
  //   if(this.state.videoList[i].snippet.title === videoName){
  //     this.setState({currentlyPlaying : this.state.videoList[i]});
  //   }
  //  }

  //}
  removeAddress (address, event){
    event.preventDefault();
    var addressesList = this.state.addressesList.filter(function(adrs){
      return address!== adrs;
    });
    this.setStates({addressesList: addressesList});
  }

  setCurrentPage (currentPage, event) {
  if(event) {
    event.preventDefault();
  }
  this.setStates({currentPage: currentPage});
}

  setStates(data) {
    if(data.placesList) {
      this.setState({placesList : data.placesList});
    }
    if(data.addressesList) {
      this.setState({addressesList : data.addressesList});
    }
    if(data.currentPage) {
      this.setState({currentPage : data.currentPage});
    }
  }

  render() {
    // if (!window.localStorage.session) {
    //   if(this.state.currentPage === '/signup'){
    //     return (
    //     <div>
    //       <SignUp onRedirect = {this.setCurrentPage.bind(this)}/>
    //     </div>
    //     )
    //   }else{
    //     return (
    //     <div>
    //       <Login onRedirect = {this.setCurrentPage.bind(this)}/>
    //     </div>
    //     )
    //   }
      
    // } else {
      return (
        <div>
          <Search addresses = {this.state.addressesList} setStates = {this.setStates.bind(this)}/>
          <AddressList addresses = {this.state.addressesList} setStates = {this.setStates.bind(this)} onRemove = {this.removeAddress.bind(this)}/>
          <PlaceList places = {this.state.placesList} />
        </div>
      )
    //}
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
