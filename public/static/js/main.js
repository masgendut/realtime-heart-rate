function main() {
    function addNewOption(value, option) {
        return '<option value="' + value + '">' + option + '</option>';
    }
    function addNewRow() {
        let rowHTML = '<tr>';
        for (let index = 0; index < arguments.length; index++) {
            rowHTML = rowHTML.concat('<td>' + arguments[index] + '</td>');
        }
        return rowHTML.concat('</tr>');
    }

    const copyrightElement = document.querySelector('.copyright');
    const informationElement = document.querySelector('.information');
    const deviceSelectElement = document.querySelector('.device-select');
    const tableBodyElement = document.querySelector('.pulse-table tbody');

    copyrightElement.innerHTML = 'Copyright &copy; ' + new Date().getFullYear() + ' Mokhamad Mustaqim';
    function showAlert(type, message) {
        informationElement.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert" role="alert">' + message + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>'
    }

    const AlertType = {
        Primary: 'primary',
        Secondary: 'secondary',
        Success: 'success',
        Danger: 'danger',
        Warning: 'warning',
        Info: 'info',
        Light: 'light',
        Dark: 'dark'
    };
    const WebSocketEvent = {
        onConnection: 'onConnection',
        onPulseEmit: 'onPulseEmit',
        onRequestDevices: 'onRequestDevices',
        onRetrieveDevices: 'onRetrieveDevices',
        onRequestPulses: 'onRequestPulses',
        onRetrievePulses: 'onRetrievePulses',
        onError: 'onError'
    };

    const serverURI = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/';

    const socket = io(serverURI, {
        autoConnect: true,
        transports: ['websocket']
    });

    socket.on(WebSocketEvent.onConnection, function(message) {
        console.log(message);
        showAlert(AlertType.Info, message);
    });

    socket.on(WebSocketEvent.onRetrieveDevices, function(devices) {
        if (!Array.isArray(devices)) {
            console.log('Data on Web Socket "onRetrieveDevices" event is not an array. Parsing failed!');
            return;
        }
        let deviceSelectHTML = '';
        for (const device of devices) {
            device.id = parseInt(device.id);
            deviceSelectHTML = deviceSelectHTML + addNewOption(device.id, device.name);
        }
        deviceSelectElement.innerHTML = '<option selected disabled>Please select a device...</option>' + deviceSelectHTML;
    });

    socket.on(WebSocketEvent.onRetrievePulses, function(pulses) {
        if (!Array.isArray(pulses)) {
            console.log('Data on Web Socket "onRetrievePulses" event is not an array. Parsing failed!');
            return;
        }
        let tableBodyHTML = '';
        for (const pulse of pulses) {
            pulse.emitted_at = new Date(pulse.emitted_at);
            tableBodyHTML = addNewRow(
                pulse.id,
                pulse.pulse,
                pulse.emitted_at.toLocaleDateString().concat(' ', pulse.emitted_at.toLocaleTimeString()),
                '-'
            ) + tableBodyHTML;
        }
        tableBodyElement.innerHTML = tableBodyHTML;
    });

    socket.on(WebSocketEvent.onPulseEmit, function(pulse) {
        const receivedAt = new Date();
        pulse.emitted_at = new Date(pulse.emitted_at);
        pulse.created_at = new Date(pulse.created_at);
        const secondsFromDevice = (receivedAt.getTime() - pulse.emitted_at.getTime()) / 1000;
        tableBodyElement.innerHTML = addNewRow(
            pulse.id,
            pulse.pulse,
            pulse.emitted_at.toLocaleDateString().concat(' ', pulse.emitted_at.toLocaleTimeString()),
            secondsFromDevice.toString() + ' s',
        ) + tableBodyElement.innerHTML;
    });

    socket.on(WebSocketEvent.onError, function(error) {
        console.log('Web Socket Request ERROR: ' + error.message);
        showAlert(AlertType.Danger, error.message);
    });

    socket.on('error', function() {
        console.log('Error');
        showAlert(AlertType.Danger, 'An unknown error happen on Web Socket.');
    });

    socket.on('connect_failed', function() {
        console.log('Failed to connect to Web Socket server!');
        showAlert(AlertType.Danger, 'Failed to connect to Web Socket server!');
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from Web Socket server!');
        createAlert(AlertType.Warning, 'Disconnected from Web Socket server!');
    });

    deviceSelectElement.addEventListener('change', function() {
        socket.emit(WebSocketEvent.onRequestPulses, parseInt(deviceSelectElement.value));
    });

    socket.emit(WebSocketEvent.onRequestDevices);

}
