# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'fb_graph'
require 'json'
require 'RMagick'
require 'base64'

class DfmApp < Sinatra::Base

  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
  end

  use Rack::Session::Cookie

  error do
    "sorry"
  end
  
  not_found do
    "404"
  end

  get '/' do
    erb :index
  end

  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    redirect auth.client.authorization_uri(:scope => [:user_photos, :friends_photos])#, :photo_upload])
  end

  get '/auth/callback' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    client = auth.client
    client.authorization_code = params[:code]
    access_token = client.access_token! :client_auth_body
    session[:token] = access_token.access_token
    redirect '/edit'
  end
  
  get '/absence.json' do
    id = params[:id]
    user = FbGraph::User.new(id, :access_token => session[:token]).fetch({"fields" => "picture.width(100).height(120)"})
    picture = {"source" => user.raw_attributes["picture"]["data"]["url"]}
    content_type :json
    picture.to_json
  end

  get '/friends.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    friends = user.friends({"locale" => "ja_JP"})
    content_type :json
    friends.to_a.map{|friend|
      {
        "id" => friend.identifier,
        "name" => friend.name, 
        "picture" => friend.picture({"&width=" => "34", "&height=" => "34"}),
      }
    }.to_json
  end

  get '/albums.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    tagged = user.photos({"type" => "tagged", "limit" => 1})[0].source
    albums = user.albums({"locale" => "ja_JP"})
    albums = albums.to_a.map{|album|
      {
        "id" => album.identifier,
        "name" => album.name,
        "source" => album.cover_photo.nil? ? nil : album.cover_photo.fetch(:access_token => session[:token]).source
      }
    }
    albums.unshift({"id" => 0, "name" => "あなたが写っている写真", "source" => tagged})
    content_type :json
    albums.to_json
  end

  get '/tagged_photos.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    photos = user.photos({"type" => "tagged"})
    photos = photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source
      }
    }
    content_type :json
    photos.to_json
  end

  get '/photos.json' do
    id = params[:id]
    album = FbGraph::Album.new(id, :access_token => session[:token]).fetch
    photos = album.photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source
      }
    }
    content_type :json
    photos.to_json
  end

  get '/closely.json' do
    absences = params[:absences].nil? ? Array::new : params[:absences]
    id = params[:id]
    user = FbGraph::User.new(id, :access_token => session[:token]).fetch

    closely = Hash::new
    absences.each{|absence|
      friends = user.mutual_friends(absence)
      friends.each{|friend|
        if closely["#{friend.identifier}"].nil?
          closely["#{friend.identifier}"] = 1
        else
          closely["#{friend.identifier}"] += 1
        end
      }
    }
    content_type :json
    params[:absences].to_json
  end
  
  get '/edit' do
    erb :edit
  end

  post '/create' do
    photo = Magick::ImageList.new(params[:photo])
    absences = params[:absence]
    tags = Array::new
    for i in 0..(absences["x"].size-1)
      absence = Magick::ImageList.new(absences["src"][i])
      photo = photo.composite(absence, absences["x"][i].to_i, absences["y"][i].to_i, Magick::OverCompositeOp)
      tags.append({"name" => i, "x" => absences["x"][i].to_i, "y" => absences["y"][i].to_i})
    end

    

    # ディレクトリが無かったら作る
    FileUtils.mkdir_p("./public/temp") unless File.exist?("./public/temp")

    filename = File.basename(params[:photo])
    photo.write("./public/temp/#{filename}"){
      self.quality = 95
    }

    session[:path] = "./public/temp/#{filename}"

    json = {
      "path" => "temp/#{filename}",
      "tags" => tags
    }
    content_type :json
    json.to_json
#    file = File::new(temp.path)
#    album = FbGraph::Album.new("356382514458483", :access_token => session[:token])
#    album.photo!(:source => file)
#    temp.close
  end

  post '/upload' do
    photo = Magick::ImageList.new(session[:path])
    tags = Array::new
    for i in 0..(params[:name].size-1)
      tags.append(FbGraph::Tag.new(:name => "tag-#{params[:name][i]}", :x => params[:x][i].to_f / photo.columns * 100, :y => params[:y][i].to_f / photo.rows * 100))
    end

    message = "#{params[:message]}\n--------------------------------\n休んだ人も写真に入れてあげましょう。\nDon't forget me!!!\n・http://don.t-forget.me\n--------------------------------"

    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    user.photo!(:source => File.new(session[:path]), :message => message, :tags => tags)
    
    # ファイルを削除
    File.delete(session[:path]) if File.exist?(session[:path])

  end
end
