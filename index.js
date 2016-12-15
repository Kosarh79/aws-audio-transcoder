// Library Code
//At this point only mp4 video is created.
var aws = require('aws-sdk');
var path = require('path');
var elastictranscoder = new aws.ElasticTranscoder();

// return basename without extension
function basename(path) {
    return path.split('/').reverse()[0].split('.')[0];
}

// return output file name with timestamp and extension
function outputKey(name, ext) {
    return name + '_trans.' + ext;
}
function notifySonicspan(filename, context){
    var lambda = new aws.Lambda({
        region: process.env.region
    });
    console.log('....notifying sonicspan from video-transcoder-dev ' + filename);
    var params = {
        FunctionName: process.env.functionName,
        Payload: JSON.stringify({"data": filename})
    };
    lambda.invoke(params, function(error, data) {
        if (error) {
            console.log('Error on notifying... ' + error);
            context.done('error', error);
        }
        if(data.Payload){
            console.log('---Nice notification went down!');
            context.succeed(data.Payload)
        }
    });
}
exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    // Get the object from the event and show its content type
    var key = event.Records[0].s3.object.key;
    var filename = path.basename(key);
    var params = {
        Input: {
            Key: key
        },
        PipelineId: process.env.pipelineId, /* test-web-transcoder */
        // OutputKeyPrefix: 'transecoded/',
        OutputKeyPrefix: 'transcodedvideos/',
        Outputs: [
            {
                Key: outputKey(basename(key),'mp4'),
                PresetId: '1351620000001-100070' // System preset: Web (Facebook Youtube)
            }
            // ,
            //  {
            //   Key: outputKey(basename(key) ,'webm'),
            //  PresetId: '1351620000001-100250', // System preset: Webm VP9 720p
            //  }
        ]
    };

    elastictranscoder.createJob(params, function(err, data) {
        console.log('Converting the video is done for ' + filename);
        if (err){
            console.log(err, err.stack); // an error occurred
            context.fail();
            return;
        }
        /** Notify Sonicspan */
        notifySonicspan(filename, context);
    });
};
