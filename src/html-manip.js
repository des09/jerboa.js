import { getGlobalOffset } from './positioning';
import { emit } from './events';
import state from './state';

/*
 HTML Manipulation Methods
 -------------------------
 */

let openSpot;


// Methods for testing
export function __getOpenSpot() {
    return openSpot;
}

export function __setOpenSpot(spot) {
    openSpot = spot;
}

export function createMarker(payload) {
    const pos = payload.position;
    const container = document.querySelector(pos.container);
    const offset = getGlobalOffset(container);
    let spot = document.createElement('div');
    let left, top;
    spot.classList.add('feedback-spot');

    if (pos.positioning === 'pixel') {
        left = offset[0] + pos.offset[0];
        top = offset[1] + pos.offset[1];
    } else if (pos.positioning === 'percent') {
        const percentX = pos.offset[0] / pos.containerSize.width;
        const percentY = pos.offset[1] / pos.containerSize.height;
        const rect = container.getBoundingClientRect();
        left = offset[0] + rect.width * percentX;
        top = offset[1] + rect.height * percentY;
    }
    spot.style.top = top + 'px';
    spot.style.left = left + 'px';

    document.body.appendChild(spot);
    return spot;
}

export function addBox(spot, toggled) {
    spot.addEventListener('click', event => {
        event.stopPropagation();

        if (toggled) {
            spot.classList.toggle('active');
            if (openSpot !== spot) {
                closeInfoBox();
                openSpot = spot;
            } else {
                openSpot = null;
            }
        }
    });

    let box = document.createElement('div');
    box.classList.add('feedback-box');
    if (toggled) {
        box.classList.add('toggled');
    }
    box.addEventListener('click', event => {
        event.stopPropagation();
    });
    spot.appendChild(box);

    let container = document.createElement('div');
    container.classList.add('feedback-container');
    box.appendChild(container);

    return {box, container};
}

export function closeInfoBox() {
    if (openSpot) {
        openSpot.classList.remove('active');
        openSpot = null;
    }
}

// addText functiona renders a single comment and all of it's replies
export function addText(container, payload) {
    let repliesContainer;

    let text = document.createElement('div');
    text.classList.add('feedback-text');
    text.textContent = payload.text;
    container.appendChild(text);

    let info = document.createElement('div');
    info.classList.add('feedback-info');
    const time = new Date(payload.datetime);
    info.textContent = 'By ' + (payload.user || 'unknown user') + ' at ' + time.toLocaleString();
    text.appendChild(info);

    let replyBtn = document.createElement('a');
    replyBtn.classList.add('reply-button');
    replyBtn.innerText = 'Reply';
    replyBtn.setAttribute('role', 'button');
    replyBtn.setAttribute('href', '#');
    text.appendChild(replyBtn);

    // if there are replies, render them
    if (payload.replies) {
        repliesContainer = document.createElement('div');
        repliesContainer.classList.add('replies-container');
        text.appendChild(repliesContainer);

        payload.replies.forEach(reply => {
            addReply(repliesContainer, reply);
        });
    };

    replyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let parts = addTextField(repliesContainer, 'Reply:');

        parts.cancel.addEventListener('click', () => {
            const reply = generateReply(parts.textarea.value);
            parts.textarea.value = '';
            emit('cancelReply', reply);
            closeInfoBox();
        });

        parts.save.addEventListener('click', () => {
            const reply = generateReply(parts.textarea.value);
            parts.textarea.value = '';
            payload.replies.push(reply);
            emit('saveReply', payload);

            repliesContainer.removeChild(parts.container);
            addReply(repliesContainer, reply);
        });
    });

    return text;
}

export function addReply(container, payload) {
    let replyContainer = document.createElement('div');
    replyContainer.classList.add('reply-container');
    container.appendChild(replyContainer);

    let reply = document.createElement('div');
    reply.classList.add('feedback-reply');
    reply.textContent = payload.text;
    replyContainer.appendChild(reply);

    let info = document.createElement('div');
    info.classList.add('feedback-info');
    const time = new Date(payload.datetime);
    info.textContent = 'By ' + (payload.user || 'unknown user') + ' at ' + time.toLocaleString();
    replyContainer.appendChild(info);

    return replyContainer;
}

export function addTextField(boxContainer, label) {
    let container = document.createElement('div');
    boxContainer.appendChild(container);

    let fieldLabel = document.createElement('label');
    fieldLabel.textContent = label;
    container.appendChild(fieldLabel);

    let textarea = document.createElement('textarea');
    container.appendChild(textarea);

    let buttonHolder = document.createElement('div');
    buttonHolder.classList.add('button-holder');
    container.appendChild(buttonHolder);

    let cancel = document.createElement('button');
    cancel.classList.add('cancel-button');
    cancel.innerText = 'Cancel';
    buttonHolder.appendChild(cancel);

    let save = document.createElement('button');
    save.classList.add('save-button');
    save.innerText = 'Save';
    buttonHolder.appendChild(save);

    return {cancel, save, textarea, container};
}

const generateReply = text => ({
    datetime: new Date().toISOString(),
    user: state.currentUser,
    text
});

const generateComment = text => ({
    datetime: new Date().toISOString(),
    user: state.currentUser,
    text,
    replies: []
});

export function createInfoBox(spot, payload) {
    const boxParts = addBox(spot, true);
    payload.comments.forEach(comment => {
        addText(boxParts.container, comment);
    });

    let parts = addTextField(boxParts.container, 'Comment:');
    parts.cancel.addEventListener('click', () => {
        const comment = generateComment(parts.textarea.value);
        parts.textarea.value = '';
        emit('cancelComment', comment);
        closeInfoBox();
    });

    parts.save.addEventListener('click', () => {
        const comment = generateComment(parts.textarea.value);
        parts.textarea.value = '';
        payload.comments.push(comment);
        emit('saveComment', payload);

        boxParts.container.removeChild(parts.container);
        addText(boxParts.container, comment);
        boxParts.container.appendChild(parts.container);
    });

    return Object.assign({}, parts, boxParts);
}