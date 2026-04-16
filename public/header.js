async function UpdateUi() {
    try{
        const response = await fetch('/getUserId');
        const id = await response.json();
        const userId = id.userId;
        const data = id.userData;
        const menu = document.querySelector('.dropdown-content');
        if (!menu) return; 
        let welcomeMessage;
        let futureEvents;
        let caledar;
        let signOutLink;
        if (userId != undefined && userId != null) {
            welcomeMessage = document.createElement('a');
            welcomeMessage.textContent = `Welcome, ${userId}!`;
            welcomeMessage.id = 'welcome-message';
            welcomeMessage.href = '/userpage/' + data.id;
            menu.appendChild(welcomeMessage);
            futureEvents = document.createElement('a');
            futureEvents.href = '/futurevents';
            futureEvents.textContent = 'Future Events';
            menu.appendChild(futureEvents);
            caledar = document.createElement('a');
            caledar.href = '/calendar';
            caledar.textContent = 'Calendar';
            menu.appendChild(caledar);
            signOutLink = document.createElement('a');
            signOutLink.href = '/signout';
            signOutLink.textContent = 'Sign Out';
            menu.appendChild(signOutLink);
        } else {
            welcomeMessage = document.createElement('a');
            welcomeMessage.textContent = 'please sign in';
            welcomeMessage.href = '/signin';
            welcomeMessage.id = 'welcome-message';
            menu.appendChild(welcomeMessage);
        }
    } catch (err) {
        console.error('Error updating UI:', err);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', UpdateUi);
} else {
    UpdateUi();
}