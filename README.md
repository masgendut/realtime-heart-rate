# Real-Time Heart Rate
Real-Time heart rates monitoring using pulse sensor

## Getting started

Before using this program, make sure you have [NodeJS](https://nodejs.org/) installed on your system.

First, all you have to do is cloning this program.

```bash
git clone https://github.com/danang-id/realtime-heart-rate.git
cd realtime-heart-rate
```

Then, install all NodeJS libraries/dependencies using NPM.

```bash
npm install
```

To start the program, run the `start` script using NPM.

```bash
npm start
```

If you want the program to automatically re-started when you save the source files, run the `dev` script using NPM. This will be useful when you are trying to develop this program.

```bash
npm dev
```

## Configuration

All configuration of this program, is saved in the file `.env` on the root of program directory. The configuration including server's port number and database configuration.

## Build and Deploy in Production

To use this app in production, you may use app like `pm2` to start this program. First, install pm2 globally if you have not done that.

```bash
npm install -g pm2
```

Make sure `pm2` has been installed by issuing `pm2` command. Terminal restart may be required after install. After `pm2` has been installed, start this program in `pm2` as cluster mode.

```bash
npm run build
pm2 start ecosystem.config.js
```

## Contribution

To contribute, simply fork this project, and issue a pull request.

## Versioning

This project is using [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/danang-id/realtime-pulse-sensor/tags).

## Authors

- **Danang Galuh Tegar Prasetyo** - _Initial work_ - [danang-id](https://github.com/danang-id)
- **Mokhamad Mustaqim** - [masgendut](https://github.com/masgendut)

See also the list of [contributors](https://github.com/danang-id/realtime-pulse-sensor/contributors) who participated in this project.

## License

This project is licensed under the Apache License version 2.0 (Apache-2.0). See [LICENSE](LICENSE) for details.
